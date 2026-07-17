import type {
  AdminSearchResult,
  AdminUser,
  ContentKind,
  ContentRecord,
  Enquiry,
  FormSubmission,
  MediaAsset,
  NavigationItem,
  Revision,
  SiteForm,
} from './types';
import type {CmsGuideAction, CmsGuideBrief, CmsGuideContext, CmsGuideFeature, CmsGuideLanguage} from './guide/aiGuide';

export const isPagesAdminMode = import.meta.env.MODE === 'github-pages';
export const PAGES_ADMIN_STORAGE_KEY = 'nk-pages-admin-workspace-v1';
export const PAGES_ADMIN_CHANGED_EVENT = 'nk-pages-admin:changed';

const createdAt = '2026-01-01T00:00:00.000Z';
export const pagesAdminUser: AdminUser = {
  id: 'pages-device-owner',
  email: 'device@nk-electrical.local',
  displayName: 'Mobile Admin',
  role: 'owner',
  active: true,
  createdAt,
  updatedAt: createdAt,
};

type LocalAudit = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown>;
  createdAt: string;
};

type PagesState = {
  schema: 1;
  records: ContentRecord[];
  navigation: NavigationItem[];
  forms: SiteForm[];
  submissions: FormSubmission[];
  enquiries: Enquiry[];
  media: MediaAsset[];
  users: AdminUser[];
  audit: LocalAudit[];
  revisions: Record<string, Revision[]>;
  favorites: string[];
};

export type PagesApiResult = {status: number; payload: unknown};

const emptyState = (): PagesState => ({
  schema: 1,
  records: [],
  navigation: [],
  forms: [],
  submissions: [],
  enquiries: [],
  media: [],
  users: [pagesAdminUser],
  audit: [],
  revisions: {},
  favorites: [],
});

const clone = <T,>(value: T): T => structuredClone(value);
const now = () => new Date().toISOString();
const id = () => typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const ok = (payload: unknown, status = 200): PagesApiResult => ({status, payload});
const fail = (status: number, code: string, message: string, fields?: Record<string, string>): PagesApiResult => ({status, payload: {error: {code, message, fields}}});

function readState(): PagesState {
  try {
    const parsed = JSON.parse(localStorage.getItem(PAGES_ADMIN_STORAGE_KEY) || '') as Partial<PagesState>;
    if (parsed.schema !== 1 || !Array.isArray(parsed.records)) return emptyState();
    return {...emptyState(), ...parsed, users: parsed.users?.length ? parsed.users : [pagesAdminUser]};
  } catch {
    return emptyState();
  }
}

function writeState(state: PagesState) {
  try {
    localStorage.setItem(PAGES_ADMIN_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    throw new Error(error instanceof DOMException && error.name === 'QuotaExceededError'
      ? 'This device workspace is full. Remove large media files and try again.'
      : 'Changes could not be saved in this browser.');
  }
  window.dispatchEvent(new CustomEvent(PAGES_ADMIN_CHANGED_EVENT));
}

function bodyOf(init: RequestInit) {
  if (!init.body || typeof init.body !== 'string') return {} as Record<string, unknown>;
  try { return JSON.parse(init.body) as Record<string, unknown>; }
  catch { return {} as Record<string, unknown>; }
}

function recordAudit(state: PagesState, action: string, entityType: string, entityId: string | null = null, details: Record<string, unknown> = {}) {
  state.audit.unshift({id: id(), action, entityType, entityId, details, createdAt: now()});
  state.audit = state.audit.slice(0, 500);
}

function saveRevision(state: PagesState, record: ContentRecord, action: string) {
  const revision: Revision = {
    id: id(), version: record.version, title: record.title, slug: record.slug, status: record.status,
    data: clone(record.draft), action, createdAt: now(), createdBy: pagesAdminUser.displayName,
  };
  state.revisions[record.id] = [revision, ...(state.revisions[record.id] || [])].slice(0, 50);
}

function workItem(record: ContentRecord, favorites: string[]) {
  return {
    id: record.id, type: 'content', kind: record.kind, title: record.title, slug: record.slug,
    status: record.status, version: record.version, category: record.category, tags: record.tags,
    updatedAt: record.updatedAt, publishedAt: record.publishedAt, updatedBy: pagesAdminUser.displayName,
    favorite: favorites.includes(`content:${record.id}`), to: `/admin/${record.kind === 'page' ? 'site-pages' : record.kind === 'settings' ? 'settings' : record.kind === 'seo' ? 'seo' : `${record.kind}s`}?record=${record.id}`,
  };
}

function searchResults(state: PagesState, query: string): AdminSearchResult[] {
  const needle = query.trim().toLowerCase();
  const content: AdminSearchResult[] = state.records.filter(record => `${record.title} ${record.slug} ${record.kind} ${record.category} ${record.tags.join(' ')}`.toLowerCase().includes(needle)).map(record => ({
    id: record.id, type: 'content', kind: record.kind, title: record.title, description: `/${record.slug}`,
    status: record.status, category: record.category, tags: record.tags, updatedAt: record.updatedAt,
    updatedBy: pagesAdminUser.displayName, favorite: state.favorites.includes(`content:${record.id}`),
    to: workItem(record, state.favorites).to,
  }));
  const media: AdminSearchResult[] = state.media.filter(item => `${item.title} ${item.filename} ${item.altText}`.toLowerCase().includes(needle)).map(item => ({
    id: item.id, type: 'media', kind: 'media', title: item.title || item.filename, description: item.altText || item.filename,
    status: item.active ? 'active' : 'inactive', category: item.category, tags: String(item.metadata.tags || '').split(',').map(value => value.trim()).filter(Boolean),
    updatedAt: item.updatedAt, updatedBy: pagesAdminUser.displayName, favorite: state.favorites.includes(`media:${item.id}`), to: `/admin/media?asset=${item.id}`,
  }));
  return [...content, ...media].slice(0, 40);
}

const guideSectionDefaults: CmsGuideAction['section'] = {
  type: 'text', eyebrow: '', title: '', body: '', buttonLabel: '', buttonUrl: '', image: '', icon: 'check', layout: 'stack', columns: 1,
};
const guideComponentDefaults: CmsGuideAction['component'] = {type: 'text', label: '', text: '', url: '', image: '', alt: '', icon: 'check', images: []};
const guideFeatures: CmsGuideFeature[] = ['hero', 'services', 'benefits', 'process', 'gallery', 'cta'];
const defaultGuideBrief: CmsGuideBrief = {title: 'AI guided page', pageType: 'landing', goal: 'leads', audience: 'mixed', tone: 'professional', requestedFeatures: ['hero', 'benefits', 'cta'], notes: '', autoApply: true};

function localGuideBrief(value: unknown): CmsGuideBrief {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<CmsGuideBrief> : {};
  const requestedFeatures = Array.isArray(source.requestedFeatures) ? source.requestedFeatures.filter((feature): feature is CmsGuideFeature => guideFeatures.includes(feature as CmsGuideFeature)).slice(0, 6) : [];
  return {
    title: String(source.title || defaultGuideBrief.title).slice(0, 240),
    pageType: ['landing', 'service', 'portfolio', 'company', 'contact'].includes(String(source.pageType)) ? source.pageType! : defaultGuideBrief.pageType,
    goal: ['leads', 'explain', 'showcase', 'trust'].includes(String(source.goal)) ? source.goal! : defaultGuideBrief.goal,
    audience: ['residential', 'commercial', 'mixed'].includes(String(source.audience)) ? source.audience! : defaultGuideBrief.audience,
    tone: ['professional', 'bold', 'technical', 'warm'].includes(String(source.tone)) ? source.tone! : defaultGuideBrief.tone,
    requestedFeatures: requestedFeatures.length ? requestedFeatures : defaultGuideBrief.requestedFeatures,
    notes: String(source.notes || '').slice(0, 1200), autoApply: source.autoApply !== false,
  };
}

function legacyPlanPagesGuideStep(body: Record<string, unknown>): PagesApiResult {
  const source = body.context && typeof body.context === 'object' ? body.context as Partial<CmsGuideContext> : null;
  if (!source?.page || !Array.isArray(source.page.sections)) return fail(400, 'guide_context_missing', 'The page structure could not be analysed. No content was changed.');
  const language: CmsGuideLanguage = body.language === 'el' ? 'el' : 'en';
  const brief = localGuideBrief(source.brief);
  const context: CmsGuideContext = {
    brief,
    page: clone(source.page),
    coreContent: clone(source.coreContent || {}),
    renderedOutline: clone(Array.isArray(source.renderedOutline) ? source.renderedOutline : []),
    availableMedia: clone(Array.isArray(source.availableMedia) ? source.availableMedia : []),
    recentChanges: clone(Array.isArray(source.recentChanges) ? source.recentChanges : []),
    constraints: {additiveOnly: true, noAutomaticPublish: true, maxSections: 40, maxComponentsPerSection: 80, maxColumns: 4, targetSections: Math.min(7, Math.max(2, brief.requestedFeatures.length)), maxGuideSteps: 32, sharedAcrossViewports: true, allowedActions: ['insert_section', 'insert_component', 'complete']},
  };
  const sections = context.page.sections.filter(section => section.enabled !== false);
  const components = sections.flatMap(section => section.components.filter(component => component.enabled !== false));
  const media = context.availableMedia.filter(item => item.url);
  const renderedContent = context.renderedOutline.map(item => `${item.headings.join(' ')} ${item.textSample}`).join(' ').toLowerCase();
  const renderedImages = context.renderedOutline.reduce((total, item) => total + item.imageCount, 0);
  const hasRenderedGallery = renderedImages >= 3 || /gallery|projects|portfolio|έργ|συλλογ/.test(renderedContent);
  const explanation = (en: CmsGuideAction['explanation'], el: CmsGuideAction['explanation']) => language === 'el' ? el : en;
  const finish = (proposal: CmsGuideAction) => ok({proposal, context, planner: 'on-device'});

  if (!sections.length && context.renderedOutline.length >= 3) return finish({
    action: 'complete', afterSectionId: '', targetSectionId: '', afterComponentId: '', section: {...guideSectionDefaults}, component: {...guideComponentDefaults},
    explanation: explanation(
      {summary: 'No safe addition is needed.', reason: 'The rendered page already has a substantial content flow. Adding another generic section would duplicate the existing design rather than improve it.', howToChange: 'Edit any existing element directly in the preview, or add a specific section manually when you have new content to publish.'},
      {summary: 'Δεν χρειάζεται ασφαλής προσθήκη.', reason: 'Η σελίδα έχει ήδη ολοκληρωμένη ροή περιεχομένου. Μια ακόμη γενική ενότητα θα επαναλάμβανε το υπάρχον design αντί να το βελτιώσει.', howToChange: 'Επεξεργάσου οποιοδήποτε υπάρχον στοιχείο μέσα στο preview ή πρόσθεσε χειροκίνητα μια συγκεκριμένη ενότητα όταν υπάρχει νέο περιεχόμενο.'},
    ),
    designNotes: language === 'el' ? ['Διατηρήθηκε το υπάρχον περιεχόμενο ακριβώς όπως είναι.', 'Δεν έγινε publish ή αλλαγή στο draft.'] : ['Existing content was preserved exactly as-is.', 'Nothing was published or changed in the draft.'],
  });

  if (!sections.length && media.length >= 2 && !hasRenderedGallery) return finish({
    action: 'insert_section', afterSectionId: '', targetSectionId: '', afterComponentId: '',
    section: {...guideSectionDefaults, type: 'media', eyebrow: language === 'el' ? 'ΕΠΙΛΕΓΜΕΝΑ ΕΡΓΑ' : 'SELECTED WORK', title: language === 'el' ? 'Συλλογή έργων' : 'Project gallery', body: language === 'el' ? 'Μια σύντομη οπτική επιλογή από πρόσφατες ηλεκτρολογικές εγκαταστάσεις.' : 'A concise visual selection of recent electrical installations.', layout: 'grid', columns: 2},
    component: {...guideComponentDefaults, type: 'gallery', label: language === 'el' ? 'Συλλογή έργων' : 'Project gallery', alt: language === 'el' ? 'Έργο της NK Electrical' : 'NK Electrical project', images: media.slice(0, 4).map(item => item.url)},
    explanation: explanation(
      {summary: 'A project gallery was added.', reason: 'The page has approved media but no visual gallery, so this adds useful proof without replacing existing content.', howToChange: 'Select the gallery to reorder or replace its images, or use Undo to remove this complete step.'},
      {summary: 'Προστέθηκε συλλογή έργων.', reason: 'Η σελίδα έχει εγκεκριμένες εικόνες αλλά όχι οπτική συλλογή, οπότε προστέθηκε χρήσιμη απόδειξη έργων χωρίς αντικατάσταση περιεχομένου.', howToChange: 'Επίλεξε τη συλλογή για αλλαγή ή σειρά εικόνων, ή χρησιμοποίησε Undo για αφαίρεση ολόκληρου του βήματος.'},
    ),
    designNotes: language === 'el' ? ['Διάταξη δύο στηλών.', 'Μόνο εγκεκριμένες εικόνες της Media Library.'] : ['Two-column responsive layout.', 'Only approved Media Library images were used.'],
  });

  const target = sections[Math.min(1, Math.max(0, sections.length - 1))];
  if (target && media.length >= 2 && !hasRenderedGallery && !components.some(component => component.type === 'gallery')) return finish({
    action: 'insert_component', afterSectionId: '', targetSectionId: target.id, afterComponentId: target.components.at(-1)?.id || '', section: {...guideSectionDefaults},
    component: {...guideComponentDefaults, type: 'gallery', label: language === 'el' ? 'Συλλογή έργων' : 'Project gallery', alt: language === 'el' ? 'Έργο της NK Electrical' : 'NK Electrical project', images: media.slice(0, 4).map(item => item.url)},
    explanation: explanation(
      {summary: 'A gallery was added to the content flow.', reason: 'The second available section is the least disruptive place for visual proof and already follows the page hierarchy.', howToChange: 'Select the gallery to replace or reorder images. Undo removes only this new component.'},
      {summary: 'Προστέθηκε συλλογή στη ροή περιεχομένου.', reason: 'Η δεύτερη διαθέσιμη ενότητα είναι το λιγότερο παρεμβατικό σημείο για οπτική απόδειξη και ακολουθεί την υπάρχουσα ιεραρχία.', howToChange: 'Επίλεξε τη συλλογή για αντικατάσταση ή αλλαγή σειράς εικόνων. Το Undo αφαιρεί μόνο αυτό το νέο component.'},
    ),
    designNotes: language === 'el' ? ['Κοινή διάταξη για όλες τις αναλύσεις.', 'Το υπάρχον περιεχόμενο δεν μετακινήθηκε.'] : ['One shared layout across every resolution.', 'No existing content was moved.'],
  });

  return finish({
    action: 'complete', afterSectionId: '', targetSectionId: '', afterComponentId: '', section: {...guideSectionDefaults}, component: {...guideComponentDefaults},
    explanation: explanation(
      {summary: 'The page is balanced and complete.', reason: 'The current structure already contains the useful content types available to this safe on-device guide.', howToChange: 'Continue editing existing elements directly, or add a specific component manually when new content is ready.'},
      {summary: 'Η σελίδα είναι ισορροπημένη και ολοκληρωμένη.', reason: 'Η τρέχουσα δομή περιέχει ήδη τους χρήσιμους τύπους περιεχομένου που μπορεί να προσθέσει με ασφάλεια ο οδηγός της συσκευής.', howToChange: 'Συνέχισε την επεξεργασία των υπαρχόντων στοιχείων ή πρόσθεσε χειροκίνητα ένα συγκεκριμένο component όταν υπάρχει νέο περιεχόμενο.'},
    ),
    designNotes: language === 'el' ? ['Καμία καταστροφική ενέργεια.', 'Καμία αυτόματη δημοσίευση.'] : ['No destructive operation was used.', 'No automatic publishing.'],
  });
}

function planPagesGuideStep(body: Record<string, unknown>): PagesApiResult {
  const source = body.context && typeof body.context === 'object' ? body.context as Partial<CmsGuideContext> : null;
  if (!source?.page || !Array.isArray(source.page.sections)) return fail(400, 'guide_context_missing', 'The page structure could not be analysed. No content was changed.');
  const language: CmsGuideLanguage = body.language === 'el' ? 'el' : 'en';
  const brief = localGuideBrief(source.brief);
  const context: CmsGuideContext = {
    brief, page: clone(source.page), coreContent: clone(source.coreContent || {}), renderedOutline: clone(Array.isArray(source.renderedOutline) ? source.renderedOutline : []),
    availableMedia: clone(Array.isArray(source.availableMedia) ? source.availableMedia : []), recentChanges: clone(Array.isArray(source.recentChanges) ? source.recentChanges : []),
    constraints: {additiveOnly: true, noAutomaticPublish: true, maxSections: 40, maxComponentsPerSection: 80, maxColumns: 4, targetSections: Math.min(7, Math.max(2, brief.requestedFeatures.length)), maxGuideSteps: 32, sharedAcrossViewports: true, allowedActions: ['insert_section', 'insert_component', 'complete']},
  };
  const sections = context.page.sections.filter(section => section.enabled !== false);
  const media = context.availableMedia.filter(item => item.url);
  const local = <T,>(en: T, el: T) => language === 'el' ? el : en;
  const finish = (proposal: CmsGuideAction) => ok({proposal, context, planner: 'state-aware-on-device'});
  const addComponent = (target: CmsGuideContext['page']['sections'][number], component: CmsGuideAction['component'], en: CmsGuideAction['explanation'], el: CmsGuideAction['explanation']) => finish({
    action: 'insert_component', afterSectionId: '', targetSectionId: target.id, afterComponentId: target.components.at(-1)?.id || '', section: {...guideSectionDefaults}, component, explanation: local(en, el), designNotes: [],
  });

  if (!sections.length) return finish({
    action: 'insert_section', afterSectionId: '', targetSectionId: '', afterComponentId: '',
    section: {...guideSectionDefaults, type: 'text', title: local('Hero section', 'Κεντρικό section'), layout: 'stack', columns: 1},
    component: {...guideComponentDefaults},
    explanation: local(
      {summary: 'The page is empty. First, it needs a section.', reason: 'A section is the container that gives the heading and content a real place in the page structure. We build the container before putting anything inside it.', howToChange: 'Let me add it live, or use Section under Add to Page yourself. You can then select and drag the whole section.'},
      {summary: 'Η σελίδα είναι κενή. Πρώτα χρειάζεται ένα section.', reason: 'Το section είναι το δοχείο που δίνει πραγματική θέση στον τίτλο και στο περιεχόμενο. Χτίζουμε πρώτα το δοχείο και μετά βάζουμε τα στοιχεία μέσα του.', howToChange: 'Άφησέ με να το προσθέσω live ή πάτησε εσύ Section στο Add to Page. Μετά μπορείς να επιλέξεις και να σύρεις ολόκληρο το section.'}),
    designNotes: [local('Sequence: section, heading, content.', 'Σειρά: section, τίτλος, περιεχόμενο.')],
  });

  const hero = sections[0];
  const heroComponents = hero.components.filter(component => component.enabled !== false);
  if (!heroComponents.some(component => component.type === 'heading')) return addComponent(hero,
    {...guideComponentDefaults, type: 'heading', label: local('Hero heading', 'Κεντρικός τίτλος'), text: local('Power and lighting, designed around real life.', 'Ρεύμα και φωτισμός, σχεδιασμένα για την πραγματική ζωή.')},
    {summary: 'The hero needs a heading.', reason: 'A visitor should understand the page before seeing supporting details.', howToChange: 'Select the heading and type directly, or edit it from Properties.'},
    {summary: 'Το hero χρειάζεται τίτλο.', reason: 'Ο επισκέπτης πρέπει να καταλαβαίνει τη σελίδα πριν δει τις υποστηρικτικές λεπτομέρειες.', howToChange: 'Επίλεξε τον τίτλο και γράψε απευθείας ή άλλαξέ τον από τις Ιδιότητες.'});

  if (!heroComponents.some(component => component.type === 'text')) return addComponent(hero,
    {...guideComponentDefaults, type: 'text', label: local('Hero paragraph', 'Εισαγωγική παράγραφος'), text: local('From planning to installation, we combine safety, comfort and clean design.', 'Από τη μελέτη μέχρι την εγκατάσταση, συνδυάζουμε ασφάλεια, άνεση και καθαρό σχεδιασμό.')},
    {summary: 'Now add a short supporting paragraph.', reason: 'The heading attracts attention; one concise paragraph explains the value without making the hero feel heavy.', howToChange: 'Click the paragraph to rewrite it. Keep it to one or two short sentences for a cleaner first screen.'},
    {summary: 'Τώρα ταιριάζει μια σύντομη υποστηρικτική παράγραφος.', reason: 'Ο τίτλος τραβά την προσοχή· μία λιτή παράγραφος εξηγεί την αξία χωρίς να βαραίνει το hero.', howToChange: 'Πάτησε την παράγραφο για να την ξαναγράψεις. Κράτησέ την σε μία ή δύο μικρές προτάσεις.'});

  if (media.length && !heroComponents.some(component => component.type === 'image' || component.type === 'gallery')) return addComponent(hero,
    {...guideComponentDefaults, type: 'image', label: local('Hero image', 'Κεντρική εικόνα'), image: media[0].url, alt: media[0].alt || local('Page hero image', 'Κεντρική εικόνα σελίδας')},
    {summary: 'The hero is ready for an image.', reason: 'The title and paragraph explain the message. An approved image now balances the second column and gives the page atmosphere.', howToChange: 'Select the image and choose another item from the Media Library. Its width, padding and position remain editable.'},
    {summary: 'Το hero είναι έτοιμο για εικόνα.', reason: 'Ο τίτλος και η παράγραφος εξηγούν ήδη το μήνυμα. Μια εγκεκριμένη εικόνα ισορροπεί τη δεύτερη στήλη και δίνει ατμόσφαιρα.', howToChange: 'Επίλεξε την εικόνα και διάλεξε άλλη από τη Media Library. Το πλάτος, το padding και η θέση της παραμένουν επεξεργάσιμα.'});

  if (!heroComponents.some(component => component.type === 'button')) return addComponent(hero,
    {...guideComponentDefaults, type: 'button', label: local('Primary action', 'Κύριο κουμπί'), text: local('Request a quote', 'Ζήτησε προσφορά'), url: '/request-a-quote'},
    {summary: 'Add one clear next action.', reason: 'The hero now explains and shows the offer, so one button gives visitors a natural next step.', howToChange: 'Select the button to change both its label and destination.'},
    {summary: 'Ας προσθέσουμε μία καθαρή επόμενη ενέργεια.', reason: 'Το hero πλέον εξηγεί και δείχνει την πρόταση, οπότε ένα μόνο κουμπί δίνει στον επισκέπτη φυσική συνέχεια.', howToChange: 'Επίλεξε το κουμπί για να αλλάξεις τόσο την ετικέτα όσο και τον προορισμό του.'});

  if (sections.length === 1) return finish({
    action: 'complete', afterSectionId: '', targetSectionId: '', afterComponentId: '', section: {...guideSectionDefaults}, component: {...guideComponentDefaults},
    explanation: local(
      {summary: 'The first page flow is complete.', reason: 'You built it in the correct order: section, heading, content, optional image and button. Every item is now a normal live editor component.', howToChange: 'Keep the draft to continue editing, or delete the demo and begin again from a blank page.'},
      {summary: 'Η πρώτη ροή της σελίδας ολοκληρώθηκε.', reason: 'Τη χτίσαμε με τη σωστή σειρά: section, τίτλος, περιεχόμενο, προαιρετική εικόνα και κουμπί. Όλα είναι πλέον κανονικά live components του editor.', howToChange: 'Κράτησε το draft για να συνεχίσεις την επεξεργασία ή διέγραψε τη demo και ξεκίνα ξανά από κενή σελίδα.'}),
    designNotes: [local('Every step was added separately and remains editable.', 'Κάθε βήμα μπήκε ξεχωριστά και παραμένει επεξεργάσιμο.')],
  });

  const second = sections[1];
  if (second && !second.components.some(component => component.enabled !== false && component.type === 'text')) return addComponent(second,
    {...guideComponentDefaults, type: 'text', label: local('Services description', 'Περιγραφή υπηρεσιών'), text: local('Planning, installation and support from one consistent technical team.', 'Μελέτη, εγκατάσταση και υποστήριξη με μία συνεπή τεχνική ομάδα.')},
    {summary: 'Give the second section a short explanation.', reason: 'Its heading introduces the subject; a compact paragraph now makes the promise concrete.', howToChange: 'Edit the paragraph directly and keep it focused on the most important customer benefit.'},
    {summary: 'Ας δώσουμε στη δεύτερη ενότητα μια σύντομη εξήγηση.', reason: 'Ο τίτλος εισάγει το θέμα· μια μικρή παράγραφος κάνει τώρα την υπόσχεση συγκεκριμένη.', howToChange: 'Άλλαξε την παράγραφο απευθείας και εστίασε στο σημαντικότερο όφελος για τον πελάτη.'});

  return finish({
    action: 'complete', afterSectionId: '', targetSectionId: '', afterComponentId: '', section: {...guideSectionDefaults}, component: {...guideComponentDefaults},
    explanation: local(
      {summary: 'This demo has a clear, balanced page flow.', reason: 'It opens with a complete hero and continues into a focused second section. More automatic content would become generic rather than helpful.', howToChange: 'Keep the draft and continue with the editor, or delete the whole demo and restart from a blank canvas.'},
      {summary: 'Η demo έχει πλέον καθαρή και ισορροπημένη ροή.', reason: 'Ξεκινά με ολοκληρωμένο hero και συνεχίζει σε εστιασμένη δεύτερη ενότητα. Περισσότερο αυτόματο περιεχόμενο θα γινόταν γενικό αντί για χρήσιμο.', howToChange: 'Κράτησε το draft και συνέχισε με τον editor ή διέγραψε ολόκληρη τη demo και ξεκίνησε ξανά από κενό καμβά.'}),
    designNotes: [local('Every element remains a normal draggable component.', 'Όλα τα στοιχεία παραμένουν κανονικά draggable components.')],
  });
}

function planBriefDrivenPagesGuideStep(body: Record<string, unknown>): PagesApiResult {
  const source = body.context && typeof body.context === 'object' ? body.context as Partial<CmsGuideContext> : null;
  if (!source?.page || !Array.isArray(source.page.sections)) return fail(400, 'guide_context_missing', 'The page structure could not be analysed. No content was changed.');
  const language: CmsGuideLanguage = body.language === 'el' ? 'el' : 'en';
  const brief = localGuideBrief(source.brief);
  const context: CmsGuideContext = {
    brief, page: clone(source.page), coreContent: clone(source.coreContent || {}), renderedOutline: clone(Array.isArray(source.renderedOutline) ? source.renderedOutline : []),
    availableMedia: clone(Array.isArray(source.availableMedia) ? source.availableMedia : []), recentChanges: clone(Array.isArray(source.recentChanges) ? source.recentChanges : []),
    constraints: {additiveOnly: true, noAutomaticPublish: true, maxSections: 40, maxComponentsPerSection: 80, maxColumns: 4, targetSections: Math.min(7, Math.max(2, brief.requestedFeatures.length)), maxGuideSteps: 32, sharedAcrossViewports: true, allowedActions: ['insert_section', 'insert_component', 'complete']},
  };
  const local = <T,>(en: T, el: T) => language === 'el' ? el : en;
  const sections = context.page.sections.filter(section => section.enabled !== false);
  const media = context.availableMedia.filter(item => item.url);
  const features = [...new Set<CmsGuideFeature>(['hero', ...brief.requestedFeatures])].slice(0, 6);
  const audience = local(
    brief.audience === 'residential' ? 'homeowners' : brief.audience === 'commercial' ? 'commercial teams' : 'homes and businesses',
    brief.audience === 'residential' ? 'ιδιοκτήτες κατοικιών' : brief.audience === 'commercial' ? 'επαγγελματικές ομάδες' : 'κατοικίες και επιχειρήσεις',
  );
  const primaryAction = brief.goal === 'leads' ? local('Request a quote', 'Ζήτησε προσφορά') : brief.goal === 'showcase' ? local('Explore our work', 'Δες τα έργα μας') : local('Talk to our team', 'Μίλησε με την ομάδα μας');
  const primaryUrl = brief.goal === 'showcase' ? '/projects' : brief.goal === 'leads' ? '/request-a-quote' : '/contact';
  const finish = (proposal: CmsGuideAction) => ok({proposal, context, planner: 'brief-driven-on-device'});

  const planFor = (feature: CmsGuideFeature) => {
    const title = {
      hero: brief.title,
      services: local('Services designed around the project', 'Υπηρεσίες σχεδιασμένες γύρω από το έργο'),
      benefits: local('Why clients choose NK Electrical', 'Γιατί οι πελάτες επιλέγουν την NK Electrical'),
      process: local('A clear path from plan to delivery', 'Καθαρή πορεία από τη μελέτη έως την παράδοση'),
      gallery: local('Selected electrical work', 'Επιλεγμένα ηλεκτρολογικά έργα'),
      cta: local('Ready to plan the next step?', 'Έτοιμοι να σχεδιάσουμε το επόμενο βήμα;'),
    }[feature];
    const body = {
      hero: brief.notes || local(`A focused ${brief.pageType} page for ${audience}, built to ${brief.goal === 'leads' ? 'turn interest into qualified enquiries' : brief.goal === 'showcase' ? 'make proven work easy to explore' : brief.goal === 'trust' ? 'build confidence through clear expertise' : 'explain the offer with clarity'}.`, `Μια στοχευμένη σελίδα για ${audience}, σχεδιασμένη ώστε ${brief.goal === 'leads' ? 'να μετατρέπει το ενδιαφέρον σε ουσιαστικές επικοινωνίες' : brief.goal === 'showcase' ? 'να παρουσιάζει καθαρά πραγματικά έργα' : brief.goal === 'trust' ? 'να χτίζει εμπιστοσύνη μέσα από σαφή τεχνογνωσία' : 'να εξηγεί καθαρά την πρόταση'}.`),
      services: local('Planning, installation and ongoing support stay connected, so every decision works as one complete electrical system.', 'Μελέτη, εγκατάσταση και συνεχής υποστήριξη παραμένουν συνδεδεμένες, ώστε κάθε απόφαση να λειτουργεί ως ένα ολοκληρωμένο ηλεκτρολογικό σύστημα.'),
      benefits: local('Safety-led engineering, careful coordination and clean execution give every client a result that is easier to use and maintain.', 'Μηχανική με προτεραιότητα στην ασφάλεια, σωστός συντονισμός και καθαρή εκτέλεση δίνουν ένα αποτέλεσμα εύκολο στη χρήση και στη συντήρηση.'),
      process: local('We clarify the requirement, define the technical plan, coordinate installation and verify the result before handover.', 'Ξεκαθαρίζουμε την ανάγκη, ορίζουμε το τεχνικό πλάνο, συντονίζουμε την εγκατάσταση και ελέγχουμε το αποτέλεσμα πριν από την παράδοση.'),
      gallery: media.length >= 2 ? local('A concise visual record of completed installations and lighting details.', 'Μια σύντομη οπτική καταγραφή ολοκληρωμένων εγκαταστάσεων και λεπτομερειών φωτισμού.') : local('Recent work spans distribution upgrades, architectural lighting, automation and ongoing technical support.', 'Πρόσφατα έργα καλύπτουν αναβαθμίσεις διανομής, αρχιτεκτονικό φωτισμό, αυτοματισμούς και συνεχή τεχνική υποστήριξη.'),
      cta: local('Share the site, priorities and timing. The team can then recommend the clearest technical route forward.', 'Μοιράσου τον χώρο, τις προτεραιότητες και το χρονοδιάγραμμα. Η ομάδα θα προτείνει την καθαρότερη τεχνική πορεία.'),
    }[feature];
    const heading: CmsGuideAction['component'] = {...guideComponentDefaults, type: 'heading', label: local(`${feature} heading`, `Τίτλος ${feature}`), text: title};
    const text: CmsGuideAction['component'] = {...guideComponentDefaults, type: 'text', label: local(`${feature} text`, `Κείμενο ${feature}`), text: body};
    const components: CmsGuideAction['component'][] = [heading, text];
    if (feature === 'hero' && media[0]) components.push({...guideComponentDefaults, type: 'image', label: local('Hero image', 'Κεντρική εικόνα'), image: media[0].url, alt: media[0].alt || brief.title});
    if (feature === 'hero' && brief.goal === 'leads') components.push({...guideComponentDefaults, type: 'button', label: local('Primary action', 'Κύρια ενέργεια'), text: primaryAction, url: primaryUrl});
    if (feature === 'benefits') components.push({...guideComponentDefaults, type: 'icon', label: local('Trust marker', 'Σήμα εμπιστοσύνης'), icon: 'shield'});
    if (feature === 'process') components.push({...guideComponentDefaults, type: 'divider', label: local('Process divider', 'Διαχωριστικό διαδικασίας')});
    if (feature === 'gallery' && media.length >= 2) components.push({...guideComponentDefaults, type: 'gallery', label: local('Project gallery', 'Συλλογή έργων'), images: media.slice(0, 6).map(item => item.url), alt: local('NK Electrical project', 'Έργο της NK Electrical')});
    if (feature === 'cta') components.push({...guideComponentDefaults, type: 'button', label: local('Call to action', 'Κάλεσμα για ενέργεια'), text: primaryAction, url: primaryUrl});
    return {
      title, components,
      section: {...guideSectionDefaults, type: feature === 'gallery' ? 'media' as const : feature === 'cta' ? 'cta' as const : feature === 'benefits' ? 'features' as const : 'text' as const, title, layout: feature === 'hero' || feature === 'gallery' ? 'split' as const : feature === 'benefits' ? 'grid' as const : 'stack' as const, columns: feature === 'benefits' ? 3 : feature === 'hero' || feature === 'gallery' ? 2 : 1},
    };
  };

  for (let featureIndex = 0; featureIndex < features.length; featureIndex += 1) {
    const feature = features[featureIndex];
    const plan = planFor(feature);
    if (!sections[featureIndex]) return finish({
      action: 'insert_section', afterSectionId: sections.at(-1)?.id || '', targetSectionId: '', afterComponentId: '', section: plan.section, component: {...guideComponentDefaults},
      explanation: {
        summary: local(`Create the ${feature} section.`, `Δημιουργία ενότητας ${feature}.`),
        reason: local(`The live JSON shows that the next requested part of the ${brief.pageType} page is still missing. This section creates its responsive container without changing anything already built.`, `Το ζωντανό JSON δείχνει ότι λείπει ακόμη το επόμενο ζητούμενο μέρος της σελίδας. Το section δημιουργεί το responsive δοχείο του χωρίς να αλλάζει τίποτα από όσα έχουν ήδη χτιστεί.`),
        howToChange: local('Select the section to change its layout or columns, drag it to reorder it, or use Undo to remove this step.', 'Επίλεξε το section για αλλαγή layout ή στηλών, σύρε το για αλλαγή σειράς ή χρησιμοποίησε Undo για αφαίρεση αυτού του βήματος.'),
      },
      designNotes: [local(`Tone: ${brief.tone}. Audience: ${brief.audience}.`, `Τόνος: ${brief.tone}. Κοινό: ${brief.audience}.`), local('The same structure is shared across desktop, tablet and mobile.', 'Η ίδια δομή εφαρμόζεται σε desktop, tablet και mobile.')],
    });
    const target = sections[featureIndex];
    const missing = plan.components.find(component => !target.components.some(existing => existing.enabled !== false && existing.type === component.type));
    if (missing) return finish({
      action: 'insert_component', afterSectionId: '', targetSectionId: target.id, afterComponentId: target.components.at(-1)?.id || '', section: {...guideSectionDefaults}, component: missing,
      explanation: {
        summary: local(`Add ${missing.label.toLowerCase()}.`, `Προσθήκη: ${missing.label.toLowerCase()}.`),
        reason: local(`The latest page JSON shows that the ${feature} container exists, but this is the most useful missing element for the selected ${brief.goal} goal.`, `Το τελευταίο JSON της σελίδας δείχνει ότι το section ${feature} υπάρχει, αλλά αυτό είναι το χρησιμότερο στοιχείο που λείπει για τον επιλεγμένο στόχο ${brief.goal}.`),
        howToChange: local('Select it in the live preview to edit its Properties. Drag it to move, use the arrow keys for precise movement, or Undo to revert this addition.', 'Επίλεξέ το στο live preview για αλλαγή από τις Ιδιότητες. Σύρε το για μετακίνηση, χρησιμοποίησε τα βελάκια για ακρίβεια ή Undo για αναίρεση της προσθήκης.'),
      },
      designNotes: [local('Only a single additive editor action is applied in this step.', 'Σε αυτό το βήμα εφαρμόζεται μόνο μία προσθετική ενέργεια του editor.')],
    });
  }

  return finish({
    action: 'complete', afterSectionId: '', targetSectionId: '', afterComponentId: '', section: {...guideSectionDefaults}, component: {...guideComponentDefaults},
    explanation: {
      summary: local(`${brief.title} is ready for your decision.`, `Η σελίδα «${brief.title}» είναι έτοιμη για την απόφασή σου.`),
      reason: local('A fresh analysis found every requested section represented in a balanced, editable flow. Another automatic addition would be repetitive.', 'Η νέα ανάλυση βρήκε όλα τα ζητούμενα sections σε μια ισορροπημένη και επεξεργάσιμη ροή. Μια ακόμη αυτόματη προσθήκη θα ήταν επαναληπτική.'),
      howToChange: local('Publish now, keep it as a draft, or delete it. Every element remains editable with the existing visual editor.', 'Δημοσίευσέ τη τώρα, κράτησέ τη ως draft ή διέγραψέ τη. Κάθε στοιχείο παραμένει επεξεργάσιμο με τον υπάρχοντα visual editor.'),
    },
    designNotes: [local('No existing page was changed.', 'Δεν άλλαξε καμία υπάρχουσα σελίδα.'), local('Publishing still requires your explicit final choice.', 'Η δημοσίευση απαιτεί τη ρητή τελική επιλογή σου.')],
  });
}

export function readPagesPublicPayload() {
  if (!isPagesAdminMode) return null;
  const state = readState();
  if (!state.records.length) return null;
  return {
    records: state.records.filter(record => record.status === 'published' && record.published).map(record => ({
      id: record.id, kind: record.kind, slug: record.slug, title: record.title, data: clone(record.published || {}), position: record.position, publishedAt: record.publishedAt || '',
    })),
    navigation: state.navigation.filter(item => item.active),
    forms: state.forms.filter(form => form.active),
    media: state.media.filter(item => item.active),
  };
}

function seedWorkspace(state: PagesState, body: Record<string, unknown>) {
  const stamp = now();
  const seedRecords = Array.isArray(body.records) ? body.records as Array<Record<string, unknown>> : [];
  const seedNavigation = Array.isArray(body.navigation) ? body.navigation as Array<Record<string, unknown>> : [];
  const seedForms = Array.isArray(body.forms) ? body.forms as Array<Record<string, unknown>> : [];
  if (!state.records.length) state.records = seedRecords.map((seed, position) => {
    const draft = clone((seed.data && typeof seed.data === 'object' ? seed.data : {}) as Record<string, unknown>);
    return {id: id(), kind: seed.kind as ContentKind, slug: String(seed.slug || ''), title: String(seed.title || ''), status: 'published', draft, published: clone(draft), version: 1, createdAt: stamp, updatedAt: stamp, publishedAt: stamp, position, category: String(seed.category || ''), tags: Array.isArray(seed.tags) ? seed.tags.map(String) : [], updatedById: pagesAdminUser.id};
  });
  if (!state.navigation.length) state.navigation = seedNavigation.map((seed, position) => ({id: id(), menu: seed.menu as NavigationItem['menu'], label: String(seed.label || ''), url: String(seed.url || ''), description: String(seed.description || ''), active: seed.active !== false, position: Number(seed.position ?? position), createdAt: stamp, updatedAt: stamp}));
  if (!state.forms.length) state.forms = seedForms.map((seed, position) => ({id: id(), slug: String(seed.slug || ''), name: String(seed.name || ''), recipient: String(seed.recipient || ''), submitLabel: String(seed.submitLabel || 'Submit'), successMessage: String(seed.successMessage || 'Thank you.'), fields: clone(Array.isArray(seed.fields) ? seed.fields : []) as SiteForm['fields'], active: seed.active !== false, position: Number(seed.position ?? position), createdAt: stamp, updatedAt: stamp}));
  recordAudit(state, 'cms.seeded', 'cms', null, {content: state.records.length, navigation: state.navigation.length, forms: state.forms.length});
  writeState(state);
}

function contentRequest(state: PagesState, parts: string[], url: URL, method: string, body: Record<string, unknown>): PagesApiResult | null {
  if (parts[1] === 'seed') {
    if (method === 'GET') return ok({needsSeed: !state.records.length || !state.navigation.length || !state.forms.length, content: state.records.length, navigation: state.navigation.length, forms: state.forms.length});
    if (method === 'POST') { seedWorkspace(state, body); return ok({inserted: state.records.length}, 201); }
  }
  if (parts.length === 1 && method === 'GET') {
    const kind = url.searchParams.get('kind');
    const kinds = (url.searchParams.get('kinds') || '').split(',').filter(Boolean);
    const records = state.records.filter(record => !kind || record.kind === kind).filter(record => !kinds.length || kinds.includes(record.kind)).sort((a, b) => a.kind.localeCompare(b.kind) || a.position - b.position);
    return ok({records: clone(records)});
  }
  if (parts[1] === 'reorder' && method === 'PATCH') {
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    state.records = state.records.map(record => ids.includes(record.id) ? {...record, position: ids.indexOf(record.id), updatedAt: now()} : record);
    recordAudit(state, 'content.reordered', String(body.kind || 'content')); writeState(state); return ok({ok: true});
  }
  if (parts[1] === 'bulk' && method === 'POST') {
    const items = Array.isArray(body.items) ? body.items as Array<Record<string, unknown>> : [];
    const action = String(body.action || ''); const stamp = now(); const changed: ContentRecord[] = [];
    state.records = state.records.map(record => {
      if (!items.some(item => item.id === record.id)) return record;
      let next = {...record, version: record.version + 1, updatedAt: stamp};
      if (action === 'publish') next = {...next, status: 'published', published: clone(record.draft), publishedAt: stamp};
      if (action === 'unpublish') next = {...next, status: 'draft', published: null, publishedAt: null};
      if (action === 'archive') next = {...next, status: 'archived'};
      if (action === 'set-category') next.category = String(body.category || '');
      if (action === 'add-tags') next.tags = [...new Set([...next.tags, ...(Array.isArray(body.tags) ? body.tags.map(String) : [])])].slice(0, 20);
      if (action === 'remove-tags') next.tags = next.tags.filter(tag => !(Array.isArray(body.tags) ? body.tags.map(String) : []).includes(tag));
      changed.push(next); saveRevision(state, next, `bulk:${action}`); return next;
    });
    recordAudit(state, `content.bulk.${action}`, 'content', null, {count: changed.length}); writeState(state); return ok({records: clone(changed), action});
  }
  if (parts.length === 1 && method === 'POST') {
    const stamp = now();
    const record: ContentRecord = {id: id(), kind: body.kind as ContentKind, slug: String(body.slug || ''), title: String(body.title || ''), status: 'draft', draft: clone((body.data || {}) as Record<string, unknown>), published: null, version: 1, createdAt: stamp, updatedAt: stamp, publishedAt: null, position: state.records.filter(item => item.kind === body.kind).length, category: String(body.category || ''), tags: Array.isArray(body.tags) ? body.tags.map(String) : [], updatedById: pagesAdminUser.id};
    if (!record.title || !record.slug) return fail(400, 'validation_failed', 'Complete the required fields.', {title: record.title ? '' : 'Required.', slug: record.slug ? '' : 'Required.'});
    state.records.push(record); saveRevision(state, record, 'created'); recordAudit(state, 'content.created', record.kind, record.id, {title: record.title}); writeState(state); return ok({record: clone(record)}, 201);
  }
  const recordIndex = state.records.findIndex(record => record.id === parts[1]);
  if (recordIndex < 0) return fail(404, 'not_found', 'Content record not found.');
  const current = state.records[recordIndex];
  if (parts.length === 2 && method === 'PUT') {
    const next: ContentRecord = {...current, title: String(body.title || current.title), slug: String(body.slug || current.slug), draft: clone((body.data || current.draft) as Record<string, unknown>), category: String(body.category || ''), tags: Array.isArray(body.tags) ? body.tags.map(String) : [], status: current.published ? 'draft' : current.status === 'archived' ? 'archived' : 'draft', version: current.version + 1, updatedAt: now(), updatedById: pagesAdminUser.id};
    state.records[recordIndex] = next; saveRevision(state, next, 'updated'); recordAudit(state, 'content.updated', next.kind, next.id, {title: next.title}); writeState(state); return ok({record: clone(next)});
  }
  if (parts.length === 2 && method === 'DELETE') {
    state.records.splice(recordIndex, 1); delete state.revisions[current.id]; recordAudit(state, 'content.deleted', current.kind, current.id, {title: current.title}); writeState(state); return ok({ok: true});
  }
  if (parts[2] === 'publish' && method === 'POST') {
    const stamp = now(); const next: ContentRecord = {...current, status: 'published', published: clone(current.draft), publishedAt: stamp, updatedAt: stamp, version: current.version + 1};
    state.records[recordIndex] = next; saveRevision(state, next, 'published'); recordAudit(state, 'content.published', next.kind, next.id, {title: next.title}); writeState(state); return ok({record: clone(next)});
  }
  if (parts[2] === 'unpublish' && method === 'POST') {
    const next: ContentRecord = {...current, status: 'draft', published: null, publishedAt: null, updatedAt: now(), version: current.version + 1};
    state.records[recordIndex] = next; saveRevision(state, next, 'unpublished'); recordAudit(state, 'content.unpublished', next.kind, next.id); writeState(state); return ok({record: clone(next)});
  }
  if (parts[2] === 'archive' && method === 'POST') {
    const next: ContentRecord = {...current, status: 'archived', updatedAt: now(), version: current.version + 1};
    state.records[recordIndex] = next; saveRevision(state, next, 'archived'); recordAudit(state, 'content.archived', next.kind, next.id); writeState(state); return ok({record: clone(next)});
  }
  if (parts[2] === 'duplicate' && method === 'POST') {
    const stamp = now(); const copy: ContentRecord = {...clone(current), id: id(), title: `${current.title} copy`, slug: `${current.slug}-copy-${Date.now().toString(36)}`, status: 'draft', published: null, publishedAt: null, version: 1, createdAt: stamp, updatedAt: stamp, position: state.records.filter(item => item.kind === current.kind).length};
    state.records.push(copy); saveRevision(state, copy, 'duplicated'); recordAudit(state, 'content.duplicated', copy.kind, copy.id, {sourceId: current.id}); writeState(state); return ok({record: clone(copy)}, 201);
  }
  if (parts[2] === 'revisions' && parts.length === 3 && method === 'GET') return ok({revisions: clone(state.revisions[current.id] || [])});
  if (parts[2] === 'revisions' && parts[3] && parts[4] === 'restore' && method === 'POST') {
    const revision = (state.revisions[current.id] || []).find(item => item.id === parts[3]);
    if (!revision) return fail(404, 'not_found', 'Revision not found.');
    const next: ContentRecord = {...current, title: revision.title, slug: revision.slug, status: 'draft', draft: clone(revision.data), version: current.version + 1, updatedAt: now()};
    state.records[recordIndex] = next; saveRevision(state, next, 'restored'); recordAudit(state, 'content.restored', next.kind, next.id, {fromVersion: revision.version}); writeState(state); return ok({record: clone(next)});
  }
  return null;
}

function collectionRequest(state: PagesState, collection: 'navigation' | 'forms', parts: string[], method: string, body: Record<string, unknown>): PagesApiResult | null {
  const list = state[collection] as Array<NavigationItem | SiteForm>;
  const responseKey = collection === 'navigation' ? 'items' : 'forms';
  const itemKey = collection === 'navigation' ? 'item' : 'form';
  if (parts.length === 1 && method === 'GET') return ok({[responseKey]: clone(list)});
  if (parts[1] === 'reorder' && method === 'PATCH') {
    const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
    state[collection] = list.map(item => ids.includes(item.id) ? {...item, position: ids.indexOf(item.id), updatedAt: now()} : item) as never;
    recordAudit(state, `${collection}.reordered`, collection); writeState(state); return ok({ok: true});
  }
  if (parts.length === 1 && method === 'POST') {
    const stamp = now(); const next = {...clone(body), id: id(), active: body.active !== false, position: list.length, createdAt: stamp, updatedAt: stamp} as NavigationItem | SiteForm;
    (state[collection] as Array<NavigationItem | SiteForm>).push(next); recordAudit(state, `${collection}.created`, collection, next.id); writeState(state); return ok({[itemKey]: clone(next)}, 201);
  }
  const index = list.findIndex(item => item.id === parts[1]);
  if (index < 0) return fail(404, 'not_found', `${collection === 'forms' ? 'Form' : 'Navigation item'} not found.`);
  const current = list[index];
  if (parts.length === 2 && method === 'PATCH') {
    const next = {...current, ...clone(body), id: current.id, createdAt: current.createdAt, updatedAt: now()} as NavigationItem | SiteForm;
    (state[collection] as Array<NavigationItem | SiteForm>)[index] = next; recordAudit(state, `${collection}.updated`, collection, next.id); writeState(state); return ok({[itemKey]: clone(next)});
  }
  if (parts[2] === 'duplicate' && method === 'POST') {
    const stamp = now(); const next = {...clone(current), id: id(), active: false, position: list.length, createdAt: stamp, updatedAt: stamp, ...(collection === 'forms' ? {name: `${(current as SiteForm).name} copy`, slug: `${(current as SiteForm).slug}-copy-${Date.now().toString(36)}`} : {label: `${(current as NavigationItem).label} copy`})} as NavigationItem | SiteForm;
    (state[collection] as Array<NavigationItem | SiteForm>).push(next); recordAudit(state, `${collection}.duplicated`, collection, next.id); writeState(state); return ok({[itemKey]: clone(next)}, 201);
  }
  if (parts.length === 2 && method === 'DELETE') {
    (state[collection] as Array<NavigationItem | SiteForm>).splice(index, 1); recordAudit(state, `${collection}.deleted`, collection, current.id); writeState(state); return ok({ok: true});
  }
  return null;
}

function dashboard(state: PagesState) {
  const statuses = {draft: 0, published: 0, archived: 0};
  const content: Record<string, number> = {};
  state.records.forEach(record => {content[record.kind] = (content[record.kind] || 0) + 1; statuses[record.status] += 1;});
  const items = state.records.map(record => workItem(record, state.favorites));
  const favorites = items.filter(item => item.favorite);
  return {
    content, statuses,
    enquiries: Object.fromEntries(['new', 'in_progress', 'waiting', 'won', 'closed', 'spam'].map(status => [status, state.enquiries.filter(item => item.status === status).length])),
    submissions: Object.fromEntries(['new', 'in_progress', 'resolved', 'spam'].map(status => [status, state.submissions.filter(item => item.status === status).length])),
    recent: state.audit.slice(0, 12).map(entry => ({id: entry.id, action: entry.action, entity_type: entry.entityType, entity_id: entry.entityId, details: entry.details, created_at: entry.createdAt, display_name: pagesAdminUser.displayName})),
    workQueue: items.filter(item => item.status === 'draft').slice(0, 12), drafts: items.filter(item => item.status === 'draft').slice(0, 12), recentlyEdited: items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 12), favorites,
    notifications: [{id: 'device-workspace', level: 'info', title: 'Device workspace', body: 'Changes are saved in this browser on this device.', to: '/admin/settings'}],
    system: [{id: 'pages-mode', label: 'Mobile Pages workspace', status: 'healthy', detail: 'Login-free browser storage is active.'}],
    summary: {content: state.records.length, media: state.media.length, activeUsers: 1, warnings: 0},
  };
}

export async function pagesAdminRequest(path: string, init: RequestInit = {}): Promise<PagesApiResult> {
  const method = String(init.method || 'GET').toUpperCase();
  const url = new URL(path, window.location.origin);
  const parts = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const body = bodyOf(init);
  const state = readState();

  if (parts[0] === 'setup') return ok(method === 'GET' ? {needsSetup: false, requiresBootstrapToken: false} : {user: pagesAdminUser, csrfToken: 'pages-device'});
  if (parts[0] === 'session' || parts[0] === 'login') return ok({user: pagesAdminUser, csrfToken: 'pages-device'});
  if (parts[0] === 'logout') return ok({ok: true});
  if (parts[0] === 'dashboard') return ok(dashboard(state));
  if (parts[0] === 'content') return contentRequest(state, parts, url, method, body) || fail(404, 'not_found', 'Content action not found.');
  if (parts[0] === 'navigation') return collectionRequest(state, 'navigation', parts, method, body) || fail(404, 'not_found', 'Navigation action not found.');
  if (parts[0] === 'forms') return collectionRequest(state, 'forms', parts, method, body) || fail(404, 'not_found', 'Form action not found.');
  if (parts[0] === 'submissions') {
    if (parts.length === 1 && method === 'GET') return ok({submissions: clone(state.submissions)});
    const index = state.submissions.findIndex(item => item.id === parts[1]);
    if (index < 0) return fail(404, 'not_found', 'Submission not found.');
    if (method === 'PATCH') {state.submissions[index] = {...state.submissions[index], status: body.status as FormSubmission['status'], notes: String(body.notes || ''), updatedAt: now()}; recordAudit(state, 'submission.updated', 'submission', parts[1]); writeState(state); return ok({submission: clone(state.submissions[index])});}
    if (method === 'DELETE') {state.submissions.splice(index, 1); writeState(state); return ok({ok: true});}
  }
  if (parts[0] === 'enquiries') {
    if (parts.length === 1 && method === 'GET') return ok({enquiries: clone(state.enquiries), assignees: [{id: pagesAdminUser.id, displayName: pagesAdminUser.displayName, email: pagesAdminUser.email}]});
    if (parts.length === 1 && method === 'POST') {const stamp = now(); const enquiry: Enquiry = {id: id(), type: String(body.type || 'phone') as Enquiry['type'], status: 'new', name: String(body.name || ''), email: String(body.email || ''), phone: String(body.phone || ''), subject: String(body.subject || ''), message: String(body.message || ''), source: 'Admin mobile workspace', assignedTo: null, notes: '', createdAt: stamp, updatedAt: stamp}; state.enquiries.unshift(enquiry); recordAudit(state, 'enquiry.created', 'enquiry', enquiry.id); writeState(state); return ok({enquiry: clone(enquiry)}, 201);}
    const index = state.enquiries.findIndex(item => item.id === parts[1]);
    if (index >= 0 && method === 'PATCH') {state.enquiries[index] = {...state.enquiries[index], status: body.status as Enquiry['status'], notes: String(body.notes || ''), assignedTo: body.assignedTo ? String(body.assignedTo) : null, updatedAt: now()}; recordAudit(state, 'enquiry.updated', 'enquiry', parts[1]); writeState(state); return ok({enquiry: clone(state.enquiries[index])});}
  }
  if (parts[0] === 'media') {
    if (parts.length === 1 && method === 'GET') return ok({media: clone(state.media)});
    if (parts.length === 1 && method === 'POST') {
      const stamp = now(); const base64 = String(body.base64 || ''); const mimeType = String(body.mimeType || 'application/octet-stream');
      if (base64.length > 4_500_000) return fail(413, 'device_storage_limit', 'For the mobile workspace, choose a file smaller than 3 MB.');
      const media: MediaAsset = {id: id(), filename: String(body.filename || 'upload'), mimeType, size: Math.round(base64.length * .75), altText: String(body.altText || ''), scope: 'shared', caption: String(body.caption || ''), title: String(body.title || body.filename || 'Upload'), folder: String(body.folder || 'General'), category: String(body.category || 'Uncategorised'), metadata: clone((body.metadata || {}) as MediaAsset['metadata']), width: null, height: null, variants: [], replacementCount: 0, active: true, position: state.media.length, updatedAt: stamp, createdAt: stamp, url: `data:${mimeType};base64,${base64}`};
      state.media.push(media); recordAudit(state, 'media.created', 'media', media.id); writeState(state); return ok({media: clone(media)}, 201);
    }
    const index = state.media.findIndex(item => item.id === parts[1]);
    if (index < 0) return fail(404, 'not_found', 'Media asset not found.');
    const current = state.media[index];
    if (parts[2] === 'usage' && method === 'GET') return ok({usage: []});
    if (parts[2] === 'duplicate' && method === 'POST') {const copy = {...clone(current), id: id(), title: `${current.title} copy`, filename: `copy-${current.filename}`, active: false, position: state.media.length, createdAt: now(), updatedAt: now()}; state.media.push(copy); writeState(state); return ok({media: clone(copy)}, 201);}
    if (parts[2] === 'replace' && method === 'POST') {const base64 = String(body.base64 || ''); const mimeType = String(body.mimeType || current.mimeType); if (base64.length > 4_500_000) return fail(413, 'device_storage_limit', 'For the mobile workspace, choose a file smaller than 3 MB.'); const next = {...current, filename: String(body.filename || current.filename), mimeType, size: Math.round(base64.length * .75), url: `data:${mimeType};base64,${base64}`, replacementCount: current.replacementCount + 1, updatedAt: now()}; state.media[index] = next; writeState(state); return ok({media: clone(next)});}
    if (parts.length === 2 && method === 'PATCH') {const next = {...current, ...clone(body), id: current.id, createdAt: current.createdAt, metadata: {...current.metadata, ...((body.metadata || {}) as MediaAsset['metadata'])}, updatedAt: now()} as MediaAsset; state.media[index] = next; writeState(state); return ok({media: clone(next)});}
    if (parts.length === 2 && method === 'DELETE') {state.media.splice(index, 1); writeState(state); return ok({ok: true});}
  }
  if (parts[0] === 'users') {
    if (method === 'GET') return ok({users: clone(state.users)});
    return fail(400, 'pages_device_mode', 'User accounts are unavailable while login is disabled on GitHub Pages.');
  }
  if (parts[0] === 'profile') return fail(400, 'pages_device_mode', 'There is no password in the login-free GitHub Pages workspace.');
  if (parts[0] === 'audit') {
    const entries = state.audit.map(entry => ({...entry, ipAddress: null, userId: pagesAdminUser.id, user: pagesAdminUser.displayName}));
    return ok({entries, total: entries.length, offset: 0, limit: 100, hasMore: false, users: [pagesAdminUser], actions: [...new Set(entries.map(entry => entry.action))], entityTypes: [...new Set(entries.map(entry => entry.entityType))]});
  }
  if (parts[0] === 'search') return ok({results: searchResults(state, url.searchParams.get('q') || '')});
  if (parts[0] === 'favorites' && parts[1] && parts[2] && method === 'PUT') {
    const key = `${parts[1]}:${parts[2]}`; const active = body.active !== false;
    state.favorites = active ? [...new Set([...state.favorites, key])] : state.favorites.filter(value => value !== key); writeState(state); return ok({active, favorites: dashboard(state).favorites});
  }
  if (parts[0] === 'guide' && parts[1] === 'next' && method === 'POST') return planBriefDrivenPagesGuideStep(body);
  return fail(404, 'not_found', 'This action is unavailable in the mobile device workspace.');
}

export function savePagesSubmission(formSlug: string, values: Record<string, string | boolean>) {
  const state = readState();
  const form = state.forms.find(item => item.slug === formSlug && item.active);
  if (!form) throw new Error('This form is not available.');
  const stamp = now();
  const submission: FormSubmission = {id: id(), formId: form.id, formName: form.name, formSlug: form.slug, status: 'new', payload: clone(values), notes: '', createdAt: stamp, updatedAt: stamp};
  state.submissions.unshift(submission); recordAudit(state, 'submission.received', 'submission', submission.id, {form: form.slug}); writeState(state);
  return form.successMessage;
}
