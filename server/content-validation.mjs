import {ApiError, cleanSlug, cleanText, normalizeEmail} from './security.mjs';

export const CONTENT_KINDS = ['page', 'service', 'product', 'catalogue', 'project', 'company', 'seo', 'settings'];

const arrays = value => {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 30) throw new ApiError(400, 'validation_failed', 'Check the list fields.', {list: 'Use no more than 30 items.'});
  return value.map(item => cleanText(item, 'list item', {max: 180})).filter(Boolean);
};
const optional = (value, field, max = 2000) => cleanText(value, field, {max, optional: true});
const required = (value, field, max = 2000) => cleanText(value, field, {max});

function internalPath(value, field, {optional: isOptional = false} = {}) {
  const text = cleanText(value, field, {max: 500, optional: isOptional});
  if (!text && isOptional) return '';
  if (!text.startsWith('/') || text.startsWith('//') || text.includes('\\') || /[\u0000-\u001f\u007f]/.test(text)) {
    throw new ApiError(400, 'validation_failed', `Check the ${field} field.`, {[field]: 'Use an internal path beginning with one forward slash.'});
  }
  if (/^\/api\/admin(?:\/|$)/i.test(text) && !/^\/api\/admin\/media\/[a-f0-9-]{36}\/file(?:[?#].*)?$/i.test(text)) {
    throw new ApiError(400, 'validation_failed', `Check the ${field} field.`, {[field]: 'Choose a public website path, not a private admin API route.'});
  }
  return text;
}

function validUrl(value, field, {relative = false} = {}) {
  const text = required(value, field, 2000);
  if (relative && text.startsWith('/')) return internalPath(text, field);
  if (/[\u0000-\u001f\u007f]/.test(text)) throw new ApiError(400, 'validation_failed', `Check the ${field} field.`, {[field]: 'Control characters are not allowed in URLs.'});
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('protocol');
    return url.href;
  } catch {
    throw new ApiError(400, 'validation_failed', `Check the ${field} field.`, {[field]: 'Use a valid HTTP(S) URL or asset path.'});
  }
}

function optionalUrl(value, field, options = {}) {
  const text = optional(value, field, 2000);
  return text ? validUrl(text, field, options) : '';
}

function objectList(value, field, mapper, max = 30) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > max) throw new ApiError(400, 'validation_failed', `Check the ${field} list.`, {[field]: `Use no more than ${max} items.`});
  const ids = new Set();
  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ApiError(400, 'validation_failed', `Check the ${field} list.`, {[field]: `Item ${index + 1} is invalid.`});
    const id = cleanSlug(optional(item.id, `${field}.${index}.id`, 80) || `${field}-${index + 1}`);
    if (ids.has(id)) throw new ApiError(400, 'validation_failed', `Check the ${field} list.`, {[field]: `The id ${id} is repeated.`});
    ids.add(id);
    return {id, ...mapper(item, index)};
  });
}

const socialPlacements = value => {
  const allowed = ['header', 'footer', 'mobile', 'contact'];
  if (value == null) return ['footer'];
  if (!Array.isArray(value) || value.length > allowed.length || value.some(item => !allowed.includes(item))) throw new ApiError(400, 'validation_failed', 'Check social link placements.', {socialLinks: 'Choose header, footer, mobile or contact.'});
  return [...new Set(value)];
};

const VISUAL_ICONS = ['arrow-right', 'arrow-up-right', 'book-open', 'box', 'check', 'chevron-down', 'circuit', 'circuit-board', 'external-link', 'file-text', 'gauge', 'lightbulb', 'link', 'mail', 'map-pin', 'menu', 'phone', 'plug-zap', 'settings', 'share', 'shield', 'shield-check', 'sliders', 'sliders-horizontal', 'sparkles', 'waves', 'wrench', 'x', 'zap'];

function visualHref(value, field) {
  const text = optional(value, field, 2000);
  if (!text) return '';
  if (/[\u0000-\u001f\u007f]/.test(text)) throw new ApiError(400, 'validation_failed', 'Check the visual link.', {[field]: 'Control characters are not allowed.'});
  if (text.startsWith('/')) return internalPath(text, field);
  if (text.startsWith('#')) return text.slice(0, 500);
  if (/^(?:mailto|tel):[^\s]+$/i.test(text)) return text;
  return validUrl(text, field);
}

function visualOverrides(value) {
  if (value == null) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'validation_failed', 'Check the direct-edit content.', {visualOverrides: 'Direct-edit values must be an object.'});
  const entries = Object.entries(value);
  if (entries.length > 1000) throw new ApiError(400, 'validation_failed', 'Check the direct-edit content.', {visualOverrides: 'A page may contain no more than 1000 directly editable elements.'});
  return Object.fromEntries(entries.map(([key, item]) => {
    if (!/^[a-f0-9]{8,16}$/i.test(key) || !item || typeof item !== 'object' || Array.isArray(item)) throw new ApiError(400, 'validation_failed', 'Check the direct-edit content.', {visualOverrides: 'A direct-edit element is invalid.'});
    const mapped = {};
    if (item.text != null) mapped.text = optional(item.text, `visualOverrides.${key}.text`, 12000);
    if (item.src != null) mapped.src = optionalUrl(item.src, `visualOverrides.${key}.src`, {relative: true});
    if (item.href != null) mapped.href = visualHref(item.href, `visualOverrides.${key}.href`);
    if (item.icon != null) mapped.icon = VISUAL_ICONS.includes(item.icon) ? item.icon : 'check';
    if (item.hidden != null) mapped.hidden = item.hidden === true;
    if (item.label != null) mapped.label = optional(item.label, `visualOverrides.${key}.label`, 180);
    if (!Object.keys(mapped).length) throw new ApiError(400, 'validation_failed', 'Check the direct-edit content.', {visualOverrides: 'A direct-edit element has no supported value.'});
    return [key, mapped];
  }));
}

function visualPlacements(value) {
  if (value == null) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError(400, 'validation_failed', 'Check the direct-edit layout.', {visualPlacements: 'Element placements must be an object.'});
  const entries = Object.entries(value);
  if (entries.length > 1000) throw new ApiError(400, 'validation_failed', 'Check the direct-edit layout.', {visualPlacements: 'A page may contain no more than 1000 moved elements.'});
  return Object.fromEntries(entries.map(([key, item]) => {
    if (!/^[a-f0-9]{8,16}$/i.test(key) || !item || typeof item !== 'object' || Array.isArray(item) || !/^[a-f0-9]{8,16}$/i.test(String(item.target || '')) || !['before', 'after'].includes(item.position)) throw new ApiError(400, 'validation_failed', 'Check the direct-edit layout.', {visualPlacements: 'A moved element has an invalid destination.'});
    return [key, {target: String(item.target), position: item.position}];
  }));
}

function structuredSettings(data) {
  const address = required(data.address, 'address', 500);
  const phone = required(data.phone, 'phone', 50);
  const email = normalizeEmail(data.email);
  const hours = required(data.hours, 'hours', 1200);
  const mapsUrl = validUrl(data.mapsUrl, 'mapsUrl');
  const objectValue = (value, fallback = {}) => value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
  const header = objectValue(data.header);
  const footer = objectValue(data.footer);
  return {
    address, phone, email, hours, mapsUrl,
    enquiryRecipient: normalizeEmail(data.enquiryRecipient),
    brandName: optional(data.brandName, 'brandName', 120) || 'NK Electrical',
    brandTagline: optional(data.brandTagline, 'brandTagline', 180) || 'Power · Light · Control',
    logoUrl: optionalUrl(data.logoUrl, 'logoUrl', {relative: true}),
    logoAlt: optional(data.logoAlt, 'logoAlt', 180) || 'NK Electrical',
    faviconUrl: optionalUrl(data.faviconUrl, 'faviconUrl', {relative: true}),
    defaultSocialImage: optionalUrl(data.defaultSocialImage, 'defaultSocialImage', {relative: true}),
    siteName: optional(data.siteName, 'siteName', 120) || 'NK Electrical',
    defaultMetaTitle: optional(data.defaultMetaTitle, 'defaultMetaTitle', 70),
    defaultMetaDescription: optional(data.defaultMetaDescription, 'defaultMetaDescription', 180),
    language: optional(data.language, 'language', 20) || 'en',
    locale: optional(data.locale, 'locale', 30) || 'en_CY',
    mapEmbedUrl: optionalUrl(data.mapEmbedUrl, 'mapEmbedUrl'),
    quoteLabel: optional(data.quoteLabel, 'quoteLabel', 80) || 'Request a Quote',
    quoteUrl: optionalUrl(data.quoteUrl, 'quoteUrl', {relative: true}) || '/request-a-quote',
    footerEyebrow: optional(data.footerEyebrow, 'footerEyebrow', 180) || 'PROJECT LINE / CYPRUS',
    footerTitle: optional(data.footerTitle, 'footerTitle', 300) || 'Define the requirement. Then build it properly.',
    footerCtaLabel: optional(data.footerCtaLabel, 'footerCtaLabel', 120) || 'Request a Quote',
    footerCopyright: optional(data.footerCopyright, 'footerCopyright', 240) || 'NK Electrical Ltd. · Since 1985',
    phones: objectList(data.phones ?? [{id: 'primary-phone', label: 'Main', number: phone, active: true, primary: true}], 'phones', item => ({label: required(item.label, 'phone label', 80), number: required(item.number, 'phone number', 50), active: item.active !== false, primary: item.primary === true})),
    emails: objectList(data.emails ?? [{id: 'primary-email', label: 'General', address: email, active: true, primary: true}], 'emails', item => ({label: required(item.label, 'email label', 80), address: normalizeEmail(item.address), active: item.active !== false, primary: item.primary === true})),
    locations: objectList(data.locations ?? [{id: 'primary-location', label: 'Main store', address, mapsUrl, active: true, primary: true}], 'locations', item => ({label: required(item.label, 'location label', 100), address: required(item.address, 'location address', 500), mapsUrl: validUrl(item.mapsUrl, 'location maps URL'), active: item.active !== false, primary: item.primary === true})),
    openingHours: objectList(data.openingHours ?? [{id: 'store-hours', label: 'Store', hours, active: true}], 'openingHours', item => ({label: required(item.label, 'hours label', 100), hours: required(item.hours, 'opening hours', 1200), active: item.active !== false})),
    socialLinks: objectList(data.socialLinks, 'socialLinks', item => ({platform: required(item.platform, 'social platform', 100), icon: optional(item.icon, 'social icon', 80) || 'globe', iconUrl: optionalUrl(item.iconUrl, 'social icon URL', {relative: true}), url: validUrl(item.url, 'social URL'), active: item.active !== false, newTab: item.newTab !== false, placements: socialPlacements(item.placements)}), 50),
    header: {sticky: header.sticky !== false, showTagline: header.showTagline !== false, showSocials: header.showSocials === true},
    footer: {showSocials: footer.showSocials !== false, showContact: footer.showContact !== false, showHours: footer.showHours === true},
    globalComponents: reusableComponents(data.globalComponents, 'global'),
    visualOverrides: visualOverrides(data.visualOverrides),
    visualPlacements: visualPlacements(data.visualPlacements),
    editorHistory: editorHistory(data.editorHistory),
  };
}

const SECTION_TYPES = ['text', 'features', 'cta', 'media'];
const SECTION_ICONS = ['check', 'zap', 'lightbulb', 'shield', 'settings', 'sliders', 'wrench', 'circuit'];
const COMPONENT_TYPES = ['heading', 'text', 'button', 'image', 'icon', 'divider'];
const COMPONENT_SCOPES = ['local', 'global'];
const COMPONENT_ALIGNS = ['left', 'center', 'right', 'stretch'];
const COMPONENT_TONES = ['default', 'accent', 'muted', 'dark'];
const HISTORY_ACTIONS = ['content', 'replace', 'style', 'resize', 'move-section', 'move-component', 'move-auto', 'delete-auto', 'restore-auto', 'add-section', 'delete-section', 'duplicate-section', 'add-component', 'delete-component', 'duplicate-component', 'group', 'ungroup', 'scope', 'reusable'];

const boundedNumber = (value, fallback, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
};

function safeHistoryValue(value, field, depth = 0) {
  if (value == null || typeof value === 'boolean') return value ?? null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') return optional(value, field, 12000);
  if (depth >= 5) throw new ApiError(400, 'validation_failed', 'Check the visual editor history.', {[field]: 'History data is too deeply nested.'});
  if (Array.isArray(value)) {
    if (value.length > 100) throw new ApiError(400, 'validation_failed', 'Check the visual editor history.', {[field]: 'History lists may contain no more than 100 values.'});
    return value.map((item, index) => safeHistoryValue(item, `${field}.${index}`, depth + 1));
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length > 80) throw new ApiError(400, 'validation_failed', 'Check the visual editor history.', {[field]: 'History objects contain too many fields.'});
    return Object.fromEntries(entries.map(([key, item]) => {
      if (!/^[a-zA-Z0-9_-]{1,80}$/.test(key) || ['__proto__', 'constructor', 'prototype'].includes(key)) throw new ApiError(400, 'validation_failed', 'Check the visual editor history.', {[field]: 'History contains an unsafe field name.'});
      return [key, safeHistoryValue(item, `${field}.${key}`, depth + 1)];
    }));
  }
  return null;
}

function component(value, field, seenIds = new Set()) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !COMPONENT_TYPES.includes(value.type)) throw new ApiError(400, 'validation_failed', 'Check the page components.', {[field]: 'Choose a supported component type.'});
  const id = cleanSlug(optional(value.id, `${field}.id`, 80) || `component-${seenIds.size + 1}`);
  if (seenIds.has(id)) throw new ApiError(400, 'validation_failed', 'Check the page components.', {[field]: `The component id ${id} is repeated.`});
  seenIds.add(id);
  const style = value.style && typeof value.style === 'object' && !Array.isArray(value.style) ? value.style : {};
  return {
    id, type: value.type, enabled: value.enabled !== false, label: optional(value.label, `${field}.label`, 120) || value.type,
    text: optional(value.text, `${field}.text`, 12000), url: optionalUrl(value.url, `${field}.url`, {relative: true}), image: optionalUrl(value.image, `${field}.image`, {relative: true}), alt: optional(value.alt, `${field}.alt`, 300), icon: SECTION_ICONS.includes(value.icon) ? value.icon : 'check', scope: COMPONENT_SCOPES.includes(value.scope) ? value.scope : 'local', reusableId: optional(value.reusableId, `${field}.reusableId`, 80), groupId: optional(value.groupId, `${field}.groupId`, 80),
    style: {width: boundedNumber(style.width, 100, 20, 100), align: COMPONENT_ALIGNS.includes(style.align) ? style.align : 'stretch', tone: COMPONENT_TONES.includes(style.tone) ? style.tone : 'default', padding: boundedNumber(style.padding, 0, 0, 64), radius: boundedNumber(style.radius, 0, 0, 48)},
  };
}

function reusableComponents(value, scope) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 80) throw new ApiError(400, 'validation_failed', 'Check the reusable components.', {components: 'Use no more than 80 reusable components.'});
  const ids = new Set();
  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new ApiError(400, 'validation_failed', 'Check the reusable components.', {components: `Reusable component ${index + 1} is invalid.`});
    const id = cleanSlug(optional(item.id, `reusable.${index}.id`, 80) || `reusable-${index + 1}`);
    if (ids.has(id)) throw new ApiError(400, 'validation_failed', 'Check the reusable components.', {components: `Reusable component id ${id} is repeated.`});
    ids.add(id);
    return {id, name: required(item.name, `reusable.${index}.name`, 120), scope, component: component({...item.component, scope, reusableId: id}, `reusable.${index}.component`), updatedAt: optional(item.updatedAt, `reusable.${index}.updatedAt`, 50) || new Date().toISOString()};
  });
}

function editorHistory(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 160) throw new ApiError(400, 'validation_failed', 'Check the visual editor history.', {editorHistory: 'History may contain no more than 160 changes.'});
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) || !HISTORY_ACTIONS.includes(entry.action)) throw new ApiError(400, 'validation_failed', 'Check the visual editor history.', {editorHistory: `History entry ${index + 1} is invalid.`});
    return {id: cleanSlug(optional(entry.id, `editorHistory.${index}.id`, 80) || `change-${index + 1}`), objectKey: required(entry.objectKey, `editorHistory.${index}.objectKey`, 180), objectLabel: required(entry.objectLabel, `editorHistory.${index}.objectLabel`, 180), action: entry.action, path: optional(entry.path, `editorHistory.${index}.path`, 500), before: safeHistoryValue(entry.before, `editorHistory.${index}.before`), after: safeHistoryValue(entry.after, `editorHistory.${index}.after`), meta: safeHistoryValue(entry.meta || {}, `editorHistory.${index}.meta`), timestamp: optional(entry.timestamp, `editorHistory.${index}.timestamp`, 50) || new Date().toISOString(), active: entry.active !== false};
  });
}
function sections(value) {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 40) throw new ApiError(400, 'validation_failed', 'Check the page sections.', {sections: 'Use no more than 40 structured sections.'});
  const ids = new Set();
  const componentIds = new Set();
  return value.map((section, index) => {
    if (!section || typeof section !== 'object' || Array.isArray(section) || !SECTION_TYPES.includes(section.type)) {
      throw new ApiError(400, 'validation_failed', 'Check the page sections.', {sections: `Section ${index + 1} has an unsupported component type.`});
    }
    const id = cleanSlug(optional(section.id, `sections.${index}.id`, 80) || `section-${index + 1}`);
    if (ids.has(id)) throw new ApiError(400, 'validation_failed', 'Check the page sections.', {sections: `Section ${index + 1} repeats the id “${id}”.`});
    ids.add(id);
    if (Array.isArray(section.components) && section.components.length > 80) throw new ApiError(400, 'validation_failed', 'Check the page components.', {sections: `Section ${index + 1} contains too many components.`});
    return {
      id,
      type: section.type,
      enabled: section.enabled !== false,
      eyebrow: optional(section.eyebrow, `sections.${index}.eyebrow`, 180),
      title: required(section.title, `sections.${index}.title`, 240),
      body: optional(section.body, `sections.${index}.body`, 6000),
      buttonLabel: optional(section.buttonLabel, `sections.${index}.buttonLabel`, 120),
      buttonUrl: optionalUrl(section.buttonUrl, `sections.${index}.buttonUrl`, {relative: true}),
      image: optionalUrl(section.image, `sections.${index}.image`, {relative: true}),
      icon: SECTION_ICONS.includes(section.icon) ? section.icon : 'check',
      items: arrays(section.items),
      layout: ['stack', 'grid', 'split'].includes(section.layout) ? section.layout : 'stack',
      columns: boundedNumber(section.columns, 1, 1, 4),
      components: Array.isArray(section.components) ? section.components.map((item, componentIndex) => component(item, `sections.${index}.components.${componentIndex}`, componentIds)) : [],
    };
  });
}

const validators = {
  page: data => ({
    eyebrow: required(data.eyebrow, 'eyebrow', 180),
    heroTitle: required(data.heroTitle, 'heroTitle', 220),
    heroAccent: optional(data.heroAccent, 'heroAccent', 220),
    heroTail: optional(data.heroTail, 'heroTail', 220),
    heroBody: required(data.heroBody, 'heroBody', 2000),
    sectionTitle: optional(data.sectionTitle, 'sectionTitle', 220),
    sectionBody: optional(data.sectionBody, 'sectionBody', 2000),
    heroImage: optionalUrl(data.heroImage, 'heroImage', {relative: true}),
    route: internalPath(data.route || '/', 'route'),
    navigationTitle: optional(data.navigationTitle, 'navigationTitle', 120),
    introTitle: optional(data.introTitle, 'introTitle', 220),
    introAccent: optional(data.introAccent, 'introAccent', 220),
    introBody: optional(data.introBody, 'introBody', 3000),
    sections: sections(data.sections),
    componentLibrary: reusableComponents(data.componentLibrary, 'local'),
    editorHistory: editorHistory(data.editorHistory),
    visualOverrides: visualOverrides(data.visualOverrides),
    visualPlacements: visualPlacements(data.visualPlacements),
  }),
  service: data => ({
    code: required(data.code, 'code', 30),
    icon: ['zap', 'lightbulb', 'sliders', 'shield', 'wrench'].includes(data.icon) ? data.icon : 'zap',
    shortTitle: required(data.shortTitle, 'shortTitle', 220),
    description: required(data.description, 'description', 1200),
    intro: required(data.intro, 'intro', 2400),
    deliverables: arrays(data.deliverables),
    applications: arrays(data.applications),
    visualOverrides: visualOverrides(data.visualOverrides),
    visualPlacements: visualPlacements(data.visualPlacements),
    editorHistory: editorHistory(data.editorHistory),
  }),
  product: data => ({
    category: required(data.category, 'category', 80),
    season: required(data.season, 'season', 80),
    space: required(data.space, 'space', 80),
    image: validUrl(data.image, 'image', {relative: true}),
    note: required(data.note, 'note', 2000),
    visualOverrides: visualOverrides(data.visualOverrides),
    visualPlacements: visualPlacements(data.visualPlacements),
    editorHistory: editorHistory(data.editorHistory),
  }),
  catalogue: data => ({
    brand: required(data.brand, 'brand', 100),
    year: required(data.year, 'year', 20),
    focus: required(data.focus, 'focus', 100),
    url: validUrl(data.url, 'url'),
    visualOverrides: visualOverrides(data.visualOverrides),
    visualPlacements: visualPlacements(data.visualPlacements),
    editorHistory: editorHistory(data.editorHistory),
  }),
  project: data => ({
    number: required(data.number, 'number', 20),
    image: validUrl(data.image, 'image', {relative: true}),
    type: required(data.type, 'type', 300),
    category: required(data.category, 'category', 80),
    completionDate: optional(data.completionDate, 'completionDate', 30),
    text: required(data.text, 'text', 5000),
    systems: arrays(data.systems),
    visualOverrides: visualOverrides(data.visualOverrides),
    visualPlacements: visualPlacements(data.visualPlacements),
    editorHistory: editorHistory(data.editorHistory),
  }),
  company: data => ({
    heading: required(data.heading, 'heading', 250),
    introduction: required(data.introduction, 'introduction', 3000),
    history: optional(data.history, 'history', 5000),
    partnerships: optional(data.partnerships, 'partnerships', 5000),
    visualOverrides: visualOverrides(data.visualOverrides),
    visualPlacements: visualPlacements(data.visualPlacements),
    editorHistory: editorHistory(data.editorHistory),
  }),
  seo: data => ({
    route: internalPath(data.route, 'route'),
    metaTitle: required(data.metaTitle, 'metaTitle', 70),
    metaDescription: required(data.metaDescription, 'metaDescription', 180),
    canonical: optionalUrl(data.canonical, 'canonical'),
    indexable: data.indexable !== false,
    ogImage: optionalUrl(data.ogImage, 'ogImage', {relative: true}),
    visualOverrides: visualOverrides(data.visualOverrides),
    visualPlacements: visualPlacements(data.visualPlacements),
    editorHistory: editorHistory(data.editorHistory),
  }),
  settings: structuredSettings,
};

export function validateContentInput(input, {partial = false} = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ApiError(400, 'invalid_body', 'Content data must be an object.');
  const kind = String(input.kind || '');
  if (!CONTENT_KINDS.includes(kind)) throw new ApiError(400, 'invalid_kind', 'Choose a supported content type.');
  const title = required(input.title, 'title', 240);
  const slug = cleanSlug(input.slug);
  if (!input.data || typeof input.data !== 'object' || Array.isArray(input.data)) throw new ApiError(400, 'invalid_data', 'Content fields are missing.');
  const data = validators[kind](input.data);
  const encoded = JSON.stringify(data);
  if (encoded.length > 500_000) throw new ApiError(413, 'content_too_large', 'This content record is too large.');
  const expectedVersion = partial ? Number(input.expectedVersion) : undefined;
  if (partial && (!Number.isInteger(expectedVersion) || expectedVersion < 1)) throw new ApiError(400, 'invalid_version', 'The record version is missing. Refresh and try again.');
  const category = optional(input.category ?? input.data.category, 'category', 100);
  const tags = arrays(input.tags ?? input.data.tags).slice(0, 20);
  return {kind, title, slug, data, category, tags, expectedVersion};
}

export function validatePublishReady(kind, data) {
  if (kind !== 'page') return;
  const errors = {};
  const pageSections = Array.isArray(data?.sections) ? data.sections : [];
  pageSections.forEach((section, sectionIndex) => {
    if (section.enabled === false) return;
    if (section.type === 'media' && !String(section.image || '').trim() && !section.components?.length) errors[`sections.${sectionIndex}.image`] = 'Choose media before publishing this section.';
    if (section.type === 'cta' && (section.buttonLabel || section.buttonUrl) && (!String(section.buttonLabel || '').trim() || !String(section.buttonUrl || '').trim())) errors[`sections.${sectionIndex}.button`] = 'Complete both the CTA label and destination.';
    (Array.isArray(section.components) ? section.components : []).forEach((item, componentIndex) => {
      if (item.enabled === false) return;
      const field = `sections.${sectionIndex}.components.${componentIndex}`;
      if (['heading', 'text'].includes(item.type) && !String(item.text || '').trim()) errors[field] = 'Add text or disable this component.';
      if (item.type === 'button' && (!String(item.text || '').trim() || !String(item.url || '').trim())) errors[field] = 'Complete the button label and destination.';
      if (item.type === 'image' && (!String(item.image || '').trim() || !String(item.alt || '').trim())) errors[field] = 'Choose an image and add alternative text.';
    });
  });
  if (Object.keys(errors).length) throw new ApiError(400, 'publish_validation_failed', 'Complete the highlighted page elements before publishing.', errors);
}
