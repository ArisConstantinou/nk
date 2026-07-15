import {ApiError, cleanSlug, cleanText, normalizeEmail} from './security.mjs';

export const NAVIGATION_MENUS = ['primary', 'services', 'shop', 'footer-services', 'footer-shop', 'footer-company'];
export const FORM_FIELD_TYPES = ['text', 'email', 'tel', 'textarea', 'select', 'checkbox'];
export const SUBMISSION_STATUSES = ['new', 'in_progress', 'resolved', 'spam'];

const optional = (value, field, max = 2000) => cleanText(value, field, {max, optional: true});
const required = (value, field, max = 2000) => cleanText(value, field, {max});
const RESERVED_FIELD_NAMES = new Set(['website', 'form-slug', 'status', 'notes', 'id', 'constructor', 'prototype', 'tostring']);

function internalOrHttpUrl(value, field) {
  const text = required(value, field, 2000);
  if (/[\u0000-\u001f\u007f]/.test(text)) throw new ApiError(400, 'validation_failed', `Check the ${field} field.`, {[field]: 'Control characters are not allowed in links.'});
  if (text.startsWith('/')) {
    if (text.startsWith('//') || text.includes('\\')) throw new ApiError(400, 'validation_failed', `Check the ${field} field.`, {[field]: 'Use an internal path beginning with one forward slash.'});
    if (/^\/api\/admin(?:\/|$)/i.test(text) && !/^\/api\/admin\/media\/[a-f0-9-]{36}\/file(?:[?#].*)?$/i.test(text)) throw new ApiError(400, 'validation_failed', `Check the ${field} field.`, {[field]: 'Choose a public website path, not a private admin API route.'});
    return text;
  }
  try {
    const parsed = new URL(text);
    if (!['http:', 'https:', 'tel:', 'mailto:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('protocol');
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : text;
  } catch {
    throw new ApiError(400, 'validation_failed', `Check the ${field} field.`, {[field]: 'Use an internal path, telephone, email or HTTP(S) URL.'});
  }
}

export function validateNavigationInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'invalid_body', 'Navigation data must be an object.');
  if (!NAVIGATION_MENUS.includes(input.menu)) throw new ApiError(400, 'invalid_menu', 'Choose a valid navigation menu.');
  return {
    menu: input.menu,
    label: required(input.label, 'label', 120),
    url: internalOrHttpUrl(input.url, 'url'),
    description: optional(input.description, 'description', 300),
    active: input.active !== false,
    position: Number.isInteger(Number(input.position)) ? Math.max(0, Number(input.position)) : 0,
  };
}

export function validateFormInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'invalid_body', 'Form data must be an object.');
  if (!Array.isArray(input.fields) || input.fields.length < 1 || input.fields.length > 30) throw new ApiError(400, 'validation_failed', 'Add between 1 and 30 form fields.', {fields: 'At least one field is required.'});
  const seen = new Set();
  const seenIds = new Set();
  const fields = input.fields.map((field, index) => {
    if (!field || typeof field !== 'object' || Array.isArray(field) || !FORM_FIELD_TYPES.includes(field.type)) throw new ApiError(400, 'validation_failed', 'Check the form fields.', {fields: `Field ${index + 1} has an unsupported type.`});
    const name = cleanSlug(field.name);
    if (RESERVED_FIELD_NAMES.has(name)) throw new ApiError(400, 'validation_failed', 'Choose a different field name.', {fields: `The field name “${name}” is reserved by the submission system.`});
    if (seen.has(name)) throw new ApiError(400, 'validation_failed', 'Field names must be unique.', {fields: `The field name “${name}” is repeated.`});
    seen.add(name);
    const id = cleanSlug(optional(field.id, 'field id', 80) || name);
    if (seenIds.has(id)) throw new ApiError(400, 'validation_failed', 'Field ids must be unique.', {fields: `The field id “${id}” is repeated.`});
    seenIds.add(id);
    if (field.type === 'select' && (!Array.isArray(field.options) || field.options.length < 1 || field.options.length > 30)) throw new ApiError(400, 'validation_failed', 'Select fields need between 1 and 30 options.', {fields: `Check the options for “${field.label || name}”.`});
    const options = field.type === 'select' ? field.options.map(value => required(value, 'option', 120)) : [];
    if (new Set(options).size !== options.length) throw new ApiError(400, 'validation_failed', 'Select options must be unique.', {fields: `Remove repeated options from “${field.label || name}”.`});
    return {id, name, label: required(field.label, 'field label', 120), type: field.type, required: field.required !== false, active: field.active !== false, placeholder: optional(field.placeholder, 'placeholder', 180), options};
  });
  return {
    slug: cleanSlug(input.slug),
    name: required(input.name, 'name', 160),
    recipient: normalizeEmail(input.recipient),
    submitLabel: required(input.submitLabel, 'submitLabel', 120),
    successMessage: required(input.successMessage, 'successMessage', 500),
    fields,
    active: input.active !== false,
    position: Number.isInteger(Number(input.position)) ? Math.max(0, Number(input.position)) : 0,
  };
}

export function validateSubmission(form, input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'invalid_body', 'Submission data must be an object.');
  if (input.website) throw new ApiError(400, 'spam_detected', 'The submission could not be accepted.');
  const values = input.values;
  if (!values || typeof values !== 'object' || Array.isArray(values)) throw new ApiError(400, 'invalid_submission', 'Form values are missing.');
  const fields = JSON.parse(form.fields_data || '[]').filter(field => field.active !== false);
  const payload = {};
  const errors = {};
  for (const field of fields) {
    const raw = values[field.name];
    if (field.type === 'checkbox') {
      payload[field.name] = raw === true || raw === 'true' || raw === 'on';
      if (field.required && !payload[field.name]) errors[field.name] = 'This confirmation is required.';
      continue;
    }
    const value = optional(raw, field.name, field.type === 'textarea' ? 8000 : 500);
    if (field.required && !value) errors[field.name] = 'This field is required.';
    if (value && field.type === 'email') {
      try { payload[field.name] = normalizeEmail(value); } catch { errors[field.name] = 'Enter a valid email address.'; }
    } else if (value && field.type === 'select' && !field.options.includes(value)) errors[field.name] = 'Choose a valid option.';
    else payload[field.name] = value;
  }
  if (Object.keys(errors).length) throw new ApiError(400, 'validation_failed', 'Check the highlighted form fields.', errors);
  return payload;
}
