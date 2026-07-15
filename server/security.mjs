import {createHash, randomBytes, scryptSync, timingSafeEqual} from 'node:crypto';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 12;
const PASSWORD_MAX = 256;

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    throw new ApiError(400, 'invalid_email', 'Enter a valid email address.', {email: 'Invalid email address.'});
  }
  return email;
}

export function validatePassword(value) {
  const password = String(value || '');
  const fields = {};
  if (password.length < PASSWORD_MIN) fields.password = `Use at least ${PASSWORD_MIN} characters.`;
  else if (password.length > PASSWORD_MAX) fields.password = `Use no more than ${PASSWORD_MAX} characters.`;
  else if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) fields.password = 'Use upper-case, lower-case and a number.';
  if (Object.keys(fields).length) throw new ApiError(400, 'weak_password', 'Choose a stronger password.', fields);
  return password;
}

export function hashPassword(password) {
  validatePassword(password);
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64, {N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024});
  return `scrypt$32768$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function verifyPassword(password, encoded) {
  try {
    if (typeof password !== 'string' || password.length > PASSWORD_MAX) return false;
    const [algorithm, costText, saltText, hashText] = String(encoded).split('$');
    const cost = Number(costText);
    if (algorithm !== 'scrypt' || cost !== 32768) return false;
    const expected = Buffer.from(hashText, 'base64url');
    if (expected.length !== 64) return false;
    const actual = scryptSync(password, Buffer.from(saltText, 'base64url'), expected.length, {N: cost, r: 8, p: 1, maxmem: 64 * 1024 * 1024});
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function safeEqual(value, expected) {
  const first = Buffer.from(String(value || ''));
  const second = Buffer.from(String(expected || ''));
  return first.length === second.length && timingSafeEqual(first, second);
}

export function readCookies(header = '') {
  return Object.fromEntries(header.split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf('=');
    if (index < 0) return [part, ''];
    try { return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))]; }
    catch { return [part.slice(0, index), '']; }
  }));
}

export function cleanText(value, field, {min = 1, max = 5000, optional = false} = {}) {
  const text = String(value ?? '').trim();
  if (optional && !text) return '';
  if (text.length < min || text.length > max) {
    throw new ApiError(400, 'validation_failed', `Check the ${field} field.`, {[field]: `Use between ${min} and ${max} characters.`});
  }
  return text;
}

export function cleanSlug(value) {
  const slug = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 100) {
    throw new ApiError(400, 'invalid_slug', 'Use a lowercase URL slug with letters, numbers and hyphens.', {slug: 'Invalid slug.'});
  }
  return slug;
}
