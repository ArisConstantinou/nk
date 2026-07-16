import {ApiError} from './security.mjs';

const ACTIONS = ['insert_section', 'insert_component', 'complete'];
const SECTION_TYPES = ['text', 'features', 'cta', 'media'];
const SECTION_LAYOUTS = ['stack', 'grid', 'split'];
const COMPONENT_TYPES = ['heading', 'text', 'button', 'image', 'gallery', 'icon', 'divider'];
const ICONS = ['check', 'zap', 'lightbulb', 'shield', 'settings', 'wrench', 'circuit'];
const PAGE_TYPES = ['landing', 'service', 'portfolio', 'company', 'contact'];
const GOALS = ['leads', 'explain', 'showcase', 'trust'];
const AUDIENCES = ['residential', 'commercial', 'mixed'];
const TONES = ['professional', 'bold', 'technical', 'warm'];
const FEATURES = ['hero', 'services', 'benefits', 'process', 'gallery', 'cta'];

const string = (value, max = 500) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const stringArray = (value, maxItems = 12, maxLength = 500) => Array.isArray(value) ? value.filter(item => typeof item === 'string').slice(0, maxItems).map(item => item.trim().slice(0, maxLength)).filter(Boolean) : [];
const record = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export const guideActionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['action', 'afterSectionId', 'targetSectionId', 'afterComponentId', 'section', 'component', 'explanation', 'designNotes'],
  properties: {
    action: {type: 'string', enum: ACTIONS},
    afterSectionId: {type: 'string'},
    targetSectionId: {type: 'string'},
    afterComponentId: {type: 'string'},
    section: {
      type: 'object', additionalProperties: false,
      required: ['type', 'eyebrow', 'title', 'body', 'buttonLabel', 'buttonUrl', 'image', 'icon', 'layout', 'columns'],
      properties: {
        type: {type: 'string', enum: SECTION_TYPES}, eyebrow: {type: 'string'}, title: {type: 'string'}, body: {type: 'string'},
        buttonLabel: {type: 'string'}, buttonUrl: {type: 'string'}, image: {type: 'string'}, icon: {type: 'string', enum: ICONS},
        layout: {type: 'string', enum: SECTION_LAYOUTS}, columns: {type: 'integer', minimum: 1, maximum: 4},
      },
    },
    component: {
      type: 'object', additionalProperties: false,
      required: ['type', 'label', 'text', 'url', 'image', 'alt', 'icon', 'images'],
      properties: {
        type: {type: 'string', enum: COMPONENT_TYPES}, label: {type: 'string'}, text: {type: 'string'}, url: {type: 'string'},
        image: {type: 'string'}, alt: {type: 'string'}, icon: {type: 'string', enum: ICONS},
        images: {type: 'array', maxItems: 8, items: {type: 'string'}},
      },
    },
    explanation: {
      type: 'object', additionalProperties: false, required: ['summary', 'reason', 'howToChange'],
      properties: {summary: {type: 'string'}, reason: {type: 'string'}, howToChange: {type: 'string'}},
    },
    designNotes: {type: 'array', maxItems: 6, items: {type: 'string'}},
  },
};

export function normalizeGuideContext(value) {
  const source = record(value);
  const briefSource = record(source.brief);
  const requestedFeatures = stringArray(briefSource.requestedFeatures, 6, 30).filter(item => FEATURES.includes(item));
  const brief = {
    title: string(briefSource.title, 240) || 'AI guided page',
    pageType: PAGE_TYPES.includes(briefSource.pageType) ? briefSource.pageType : 'landing',
    goal: GOALS.includes(briefSource.goal) ? briefSource.goal : 'leads',
    audience: AUDIENCES.includes(briefSource.audience) ? briefSource.audience : 'mixed',
    tone: TONES.includes(briefSource.tone) ? briefSource.tone : 'professional',
    requestedFeatures: requestedFeatures.length ? requestedFeatures : ['hero', 'benefits', 'cta'],
    notes: string(briefSource.notes, 1200), autoApply: briefSource.autoApply !== false,
  };
  const page = record(source.page);
  const sections = Array.isArray(page.sections) ? page.sections.slice(0, 40).map((item, sectionIndex) => {
    const section = record(item);
    const components = Array.isArray(section.components) ? section.components.slice(0, 80).map((componentValue, componentIndex) => {
      const component = record(componentValue);
      return {
        id: string(component.id, 80) || `component-${sectionIndex + 1}-${componentIndex + 1}`,
        type: COMPONENT_TYPES.includes(component.type) ? component.type : 'text',
        label: string(component.label, 120), text: string(component.text, 600), image: string(component.image, 500),
        images: stringArray(component.images, 8, 500), width: Math.min(100, Math.max(20, Number(component.width) || 100)),
        tone: string(component.tone, 30), enabled: component.enabled !== false,
      };
    }) : [];
    return {
      id: string(section.id, 80) || `section-${sectionIndex + 1}`,
      type: SECTION_TYPES.includes(section.type) ? section.type : 'text', title: string(section.title, 240), body: string(section.body, 800),
      layout: SECTION_LAYOUTS.includes(section.layout) ? section.layout : 'stack', columns: Math.min(4, Math.max(1, Number(section.columns) || 1)),
      enabled: section.enabled !== false, components,
    };
  }) : [];
  const availableMedia = Array.isArray(source.availableMedia) ? source.availableMedia.slice(0, 30).map(item => {
    const media = record(item);
    return {id: string(media.id, 80), url: string(media.url, 500), alt: string(media.alt, 300)};
  }).filter(item => item.id && item.url) : [];
  const coreContentSource = record(source.coreContent);
  const coreContent = Object.fromEntries(Object.entries(coreContentSource).slice(0, 80).flatMap(([key, item]) => {
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(key) || !['string', 'number', 'boolean'].includes(typeof item)) return [];
    return [[key, typeof item === 'string' ? string(item, 800) : item]];
  }));
  const renderedOutline = Array.isArray(source.renderedOutline) ? source.renderedOutline.slice(0, 30).map((item, index) => {
    const outline = record(item);
    return {
      index: Math.max(0, Number(outline.index) || index), id: string(outline.id, 100), role: string(outline.role, 80), className: string(outline.className, 240),
      headings: stringArray(outline.headings, 8, 240), textSample: string(outline.textSample, 1200), imageCount: Math.max(0, Math.min(30, Number(outline.imageCount) || 0)),
      links: stringArray(outline.links, 12, 180), builderSectionId: string(outline.builderSectionId, 80),
    };
  }) : [];
  return {
    brief, page: {id: string(page.id, 80), slug: string(page.slug, 120), title: string(page.title, 240), route: string(page.route, 300), sections},
    coreContent, renderedOutline, availableMedia,
    recentChanges: stringArray(source.recentChanges, 12, 240),
    constraints: {
      additiveOnly: true, noAutomaticPublish: true, maxSections: 40, maxComponentsPerSection: 80, maxColumns: 4,
      targetSections: Math.min(7, Math.max(2, brief.requestedFeatures.length)), maxGuideSteps: 32,
      sharedAcrossViewports: true, allowedActions: ACTIONS,
    },
  };
}

function safeUrl(value, {relative = true} = {}) {
  const candidate = string(value, 500);
  if (!candidate) return '';
  if (relative && candidate.startsWith('/') && !candidate.startsWith('//')) return candidate;
  try {
    const parsed = new URL(candidate);
    return ['http:', 'https:'].includes(parsed.protocol) ? candidate : '';
  } catch { return ''; }
}

export function validateGuideProposal(value, contextValue) {
  const proposal = record(value);
  const context = normalizeGuideContext(contextValue);
  if (!ACTIONS.includes(proposal.action)) throw new ApiError(502, 'ai_invalid_action', 'The AI returned an unsupported guide action. No content was changed.');
  const action = proposal.action;
  const sectionIds = new Set(context.page.sections.map(section => section.id));
  const mediaUrls = new Set(context.availableMedia.map(item => item.url));
  const afterSectionId = string(proposal.afterSectionId, 80);
  const targetSectionId = string(proposal.targetSectionId, 80);
  const afterComponentId = string(proposal.afterComponentId, 80);
  if (action === 'insert_section') {
    if (context.page.sections.length >= 40) throw new ApiError(409, 'guide_constraint_failed', 'This page already has the maximum number of sections. No content was changed.');
    if (context.page.sections.length && (!afterSectionId || !sectionIds.has(afterSectionId))) throw new ApiError(502, 'ai_invalid_target', 'The AI selected an unknown section. No content was changed.');
  }
  if (action === 'insert_component') {
    const target = context.page.sections.find(section => section.id === targetSectionId);
    if (!target) throw new ApiError(502, 'ai_invalid_target', 'The AI selected an unknown section. No content was changed.');
    if (target.components.length >= 80) throw new ApiError(409, 'guide_constraint_failed', 'That section already has the maximum number of components. No content was changed.');
    if (afterComponentId && !target.components.some(component => component.id === afterComponentId)) throw new ApiError(502, 'ai_invalid_target', 'The AI selected an unknown component position. No content was changed.');
  }
  const sectionValue = record(proposal.section);
  const componentValue = record(proposal.component);
  const componentType = COMPONENT_TYPES.includes(componentValue.type) ? componentValue.type : 'text';
  const componentLabel = string(componentValue.label, 120) || componentType;
  const images = stringArray(componentValue.images, 8, 500);
  const image = string(componentValue.image, 500);
  if ((image && !mediaUrls.has(image)) || images.some(url => !mediaUrls.has(url))) throw new ApiError(502, 'ai_unapproved_media', 'The AI selected media outside the approved library. No content was changed.');
  if (action !== 'complete' && componentType === 'gallery' && images.length < 2) throw new ApiError(502, 'ai_invalid_gallery', 'A gallery needs at least two approved images. No content was changed.');
  const explanationValue = record(proposal.explanation);
  return {
    action, afterSectionId, targetSectionId, afterComponentId,
    section: {
      type: SECTION_TYPES.includes(sectionValue.type) ? sectionValue.type : 'text', eyebrow: string(sectionValue.eyebrow, 180),
      title: string(sectionValue.title, 240) || 'New guided section', body: string(sectionValue.body, 3000), buttonLabel: string(sectionValue.buttonLabel, 120),
      buttonUrl: safeUrl(sectionValue.buttonUrl), image: mediaUrls.has(string(sectionValue.image, 500)) ? string(sectionValue.image, 500) : '',
      icon: ICONS.includes(sectionValue.icon) ? sectionValue.icon : 'check', layout: SECTION_LAYOUTS.includes(sectionValue.layout) ? sectionValue.layout : 'stack',
      columns: Math.min(4, Math.max(1, Number(sectionValue.columns) || 1)),
    },
    component: {
      type: componentType, label: componentLabel, text: string(componentValue.text, 4000),
      url: safeUrl(componentValue.url), image, alt: string(componentValue.alt, 300) || (['image', 'gallery'].includes(componentType) ? componentLabel : ''), icon: ICONS.includes(componentValue.icon) ? componentValue.icon : 'check', images,
    },
    explanation: {
      summary: string(explanationValue.summary, 500) || (action === 'complete' ? 'No further safe improvement is needed.' : 'A safe improvement was added to the draft.'),
      reason: string(explanationValue.reason, 1000) || 'It fits the current page structure and design constraints.',
      howToChange: string(explanationValue.howToChange, 1000) || 'Select the new element in the visual editor to change or undo it.',
    },
    designNotes: stringArray(proposal.designNotes, 6, 300),
  };
}

const instructions = `You are a friendly adaptive co-builder inside the NK Electrical visual CMS editor. Analyze the entire fresh page-structure JSON for every request and return exactly one best next action. The brief is the user's source of truth for page type, goal, audience, tone, requested features, and notes. The editor may apply your safe proposal automatically, one visible step at a time.

Safety rules:
- You may only add one section or one component, or return complete. Never delete, replace, hide, move, rename, or overwrite existing content.
- Use only section/component IDs and media URLs present in the input JSON. Never invent an image URL.
- Respect every constraint, current layout pattern, component density, responsive behavior, and the existing dark electrical design language.
- Avoid duplicating content already present. Prefer complete when no meaningful safe improvement exists.
- The renderedOutline describes the real live preview and may contain substantial page content even when page.sections is empty. Analyse coreContent, renderedOutline, and builder sections together; never call a page empty solely because builder sections is empty.
- This workflow teaches page hierarchy one live action at a time. When the canvas is genuinely empty, the first action MUST be insert_section only. Its component payload is ignored. Explain why the section is the container for the first brief-requested feature.
- Build a complete but concise multi-section page that satisfies the brief, normally 2-7 sections. A new section is always inserted alone; fill it with individual components in later actions before creating the next section. Never combine section + heading or multiple visible components into one step.
- In builder sections, section.title is an internal admin label and is not rendered as page content. If a section has no heading component, add the heading component before supporting text. Never infer a visible heading from section.title alone.
- Infer which requested features are already represented from section titles, components, renderedOutline, and recentChanges. Do not follow a universal checklist. Choose the next missing feature and the most useful component for the current section.
- Give each section a clear job. A useful section normally has a heading and concise supporting content; add approved imagery, galleries, benefits, process copy, or a CTA only when they support the selected goal. Use the user's title, audience, tone, and notes in real publishable copy.
- Return complete only when the brief's requested features and primary goal are adequately represented, or when another additive action would be repetitive. Stay within maxGuideSteps and targetSections.
- Treat manual editor changes as intentional. Adapt the next proposal to the current hierarchy instead of following a fixed checklist. If a hero or any suggested element already exists, choose the next missing piece.
- Keep copy concise, useful, and suitable for a polished real page. Do not use tutorial filler as page content.
- For an image gallery, use 2-8 approved media-library URLs. Place it where it improves the content flow; for example after the second section only when that is genuinely the best location.
- Explanations must use warm, beginner-friendly language, explicitly connect each step to the previous one, and tell the administrator what will be added, why it follows now, and exactly how they can add/change it themselves, move it, or undo it in the editor.
- Match the requested explanation language while keeping JSON keys unchanged. In every explanation, teach what just became possible in the existing editor and mention selection, drag-and-drop, keyboard movement, Properties, or Undo when relevant.`;

function extractOutputText(payload) {
  if (typeof payload?.output_text === 'string') return payload.output_text;
  if (!Array.isArray(payload?.output)) return '';
  return payload.output.flatMap(item => Array.isArray(item?.content) ? item.content : []).filter(item => item?.type === 'output_text' && typeof item.text === 'string').map(item => item.text).join('');
}

export async function requestGuideProposal({context, language = 'en', apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_GUIDE_MODEL || 'gpt-5.6', fetchImpl = fetch}) {
  if (!apiKey) throw new ApiError(503, 'ai_not_configured', 'The AI guide is not configured on this admin server. No content was changed.');
  const normalizedContext = normalizeGuideContext(context);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let response;
  try {
    response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST', signal: controller.signal,
      headers: {'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json'},
      body: JSON.stringify({
        model, store: false, instructions,
        input: `Explanation language: ${language === 'el' ? 'Greek' : 'English'}\nFresh CMS page structure:\n${JSON.stringify(normalizedContext)}`,
        text: {format: {type: 'json_schema', name: 'cms_guide_action', strict: true, schema: guideActionSchema}},
      }),
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new ApiError(504, 'ai_timeout', 'The AI guide took too long to respond. No content was changed.');
    throw new ApiError(502, 'ai_unavailable', 'The AI guide could not be reached. No content was changed.');
  } finally { clearTimeout(timeout); }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(502, 'ai_request_failed', 'The AI guide could not complete the analysis. No content was changed.');
  const text = extractOutputText(payload);
  if (!text) throw new ApiError(502, 'ai_empty_response', 'The AI guide did not return an action. No content was changed.');
  let proposal;
  try { proposal = JSON.parse(text); }
  catch { throw new ApiError(502, 'ai_invalid_json', 'The AI guide returned invalid JSON. No content was changed.'); }
  return {proposal: validateGuideProposal(proposal, normalizedContext), context: normalizedContext, model};
}
