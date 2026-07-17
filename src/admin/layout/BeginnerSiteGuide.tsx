import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Bot, Check, CheckCircle2, FilePlus2, Image as ImageIcon, LayoutTemplate, ListTree, LoaderCircle, PanelBottom, PanelTop, Rocket, Save, Sparkles, Type, X} from 'lucide-react';
import {adminApi, errorMessage} from '../api';
import type {ContentRecord, NavigationItem, PageComponentType} from '../types';
import {useAdminLanguage} from '../i18n/AdminLanguage';

type Language = 'el' | 'en';
type Stage = 'intro' | 'loading' | 'add-page' | 'page-title' | 'page-save' | 'nav-open' | 'nav-label' | 'nav-url' | 'nav-save' | 'content-section' | 'content-component' | 'content-page-done' | 'footer-menu' | 'footer-open' | 'footer-label' | 'footer-url' | 'footer-save' | 'settings-tab' | 'settings-review' | 'review' | 'publish' | 'done' | 'error';
type PageKey = 'home' | 'gallery' | 'projects' | 'about' | 'contact';
type GuidePage = {key: PageKey; suggestedTitle: string; id: string; title: string; route: string; status: ContentRecord['status'] | 'missing'};

const t = (language: Language, el: string, en: string) => language === 'el' ? el : en;
const pageDefinitions: Array<{key: PageKey; title: string; slugs: string[]; route: string; recipe: PageComponentType[]}> = [
  {key: 'home', title: 'Home', slugs: ['homepage', 'home'], route: '/', recipe: ['heading', 'text', 'image', 'button']},
  {key: 'gallery', title: 'Gallery', slugs: ['gallery'], route: '/gallery', recipe: ['heading', 'text', 'gallery']},
  {key: 'projects', title: 'Projects', slugs: ['projects'], route: '/projects', recipe: ['heading', 'text', 'image', 'button']},
  {key: 'about', title: 'About', slugs: ['about'], route: '/about', recipe: ['heading', 'text', 'image']},
  {key: 'contact', title: 'Contact', slugs: ['contact'], route: '/contact', recipe: ['heading', 'text', 'button']},
];

const routeFor = (record: ContentRecord) => String(record.draft.route || (record.slug === 'homepage' ? '/' : `/${record.slug}`));
const plannedPages = (records: ContentRecord[]): GuidePage[] => pageDefinitions.map(definition => {
  const record = records.find(item => item.kind === 'page' && item.status !== 'archived' && (definition.slugs.includes(item.slug.toLowerCase()) || routeFor(item) === definition.route));
  return record
    ? {key: definition.key, suggestedTitle: definition.title, id: record.id, title: record.title, route: routeFor(record), status: record.status}
    : {key: definition.key, suggestedTitle: definition.title, id: '', title: definition.title, route: definition.route, status: 'missing'};
});
const recipeFor = (key?: PageKey) => pageDefinitions.find(item => item.key === key)?.recipe || ['heading', 'text'];
const componentName = (language: Language, type?: PageComponentType) => ({
  heading: t(language, 'τίτλο', 'heading'), text: t(language, 'κείμενο', 'text'), image: t(language, 'εικόνα', 'image'), gallery: t(language, 'gallery φωτογραφιών', 'photo gallery'), button: t(language, 'κουμπί', 'button'), icon: t(language, 'εικονίδιο', 'icon'), divider: t(language, 'διαχωριστική γραμμή', 'divider'),
}[type || 'text']);

export function BeginnerSiteGuide({open, onClose, onNavigate}: {open: boolean; onClose: () => void; onNavigate: (to: string) => void}) {
  const {language, setLanguage} = useAdminLanguage();
  const [stage, setStage] = useState<Stage>('intro');
  const [pages, setPages] = useState<GuidePage[]>(() => pageDefinitions.map(item => ({key: item.key, suggestedTitle: item.title, id: '', title: item.title, route: item.route, status: 'missing'})));
  const [navQueue, setNavQueue] = useState<GuidePage[]>([]);
  const [navCursor, setNavCursor] = useState(0);
  const [contentIndex, setContentIndex] = useState(0);
  const [componentIndex, setComponentIndex] = useState(0);
  const [publishQueue, setPublishQueue] = useState<GuidePage[]>([]);
  const [publishCursor, setPublishCursor] = useState(0);
  const [coachSide, setCoachSide] = useState<'left' | 'right'>('right');
  const [failure, setFailure] = useState('');
  const targetRef = useRef<HTMLElement | null>(null);

  useEffect(() => {localStorage.setItem('nk-beginner-guide-language', language);}, [language]);
  const missingPage = pages.find(item => !item.id);
  const currentNavPage = navQueue[navCursor];
  const contentPages = useMemo(() => pages.filter(item => item.id), [pages]);
  const currentContentPage = contentPages[contentIndex];
  const currentRecipe = recipeFor(currentContentPage?.key);
  const currentComponent = currentRecipe[componentIndex];
  const contactPage = pages.find(item => item.key === 'contact' && item.id);
  const currentPublishPage = publishQueue[publishCursor];

  const beginContent = useCallback((nextPages: GuidePage[]) => {
    const available = nextPages.filter(item => item.id);
    if (!available.length) {setFailure(t(language, 'Δεν βρέθηκαν σελίδες για επεξεργασία.', 'No pages were found to edit.')); setStage('error'); return;}
    setPages(nextPages); setContentIndex(0); setComponentIndex(0); setStage('content-section');
    onNavigate(`/admin/pages?record=${encodeURIComponent(available[0].id)}`);
  }, [language, onNavigate]);

  const beginNavigation = useCallback(async (nextPages: GuidePage[]) => {
    setStage('loading');
    try {
      const {items} = await adminApi<{items: NavigationItem[]}>('/navigation');
      const queue = nextPages.filter(page => page.id && !items.some(item => item.menu === 'primary' && item.active && item.url === page.route));
      setPages(nextPages); setNavQueue(queue); setNavCursor(0); onNavigate('/admin/site-pages');
      if (queue.length) setStage('nav-open'); else beginContent(nextPages);
    } catch (error) {setFailure(errorMessage(error)); setStage('error');}
  }, [beginContent, onNavigate]);

  const beginSettings = useCallback(() => {onNavigate('/admin/settings'); setStage('settings-tab');}, [onNavigate]);
  const beginFooter = useCallback(async () => {
    if (!contactPage) {beginSettings(); return;}
    setStage('loading');
    try {
      const {items} = await adminApi<{items: NavigationItem[]}>('/navigation');
      if (items.some(item => item.menu === 'footer-company' && item.active && item.url === contactPage.route)) {beginSettings(); return;}
      onNavigate('/admin/site-pages?navigation=1'); setStage('footer-menu');
    } catch (error) {setFailure(errorMessage(error)); setStage('error');}
  }, [beginSettings, contactPage, onNavigate]);

  const start = async () => {
    setStage('loading'); setFailure('');
    try {
      const {records} = await adminApi<{records: ContentRecord[]}>('/content?kind=page');
      const next = plannedPages(records); setPages(next); onNavigate('/admin/site-pages');
      if (next.some(item => !item.id)) setStage('add-page'); else await beginNavigation(next);
    } catch (error) {setFailure(errorMessage(error)); setStage('error');}
  };

  useEffect(() => {
    const saved = (event: Event) => {
      if (stage !== 'page-save') return;
      const detail = (event as CustomEvent<{id: string; title: string; route: string}>).detail;
      const index = pages.findIndex(item => !item.id); if (index < 0 || !detail?.id) return;
      const next = pages.map((page, pageIndex) => pageIndex === index ? {...page, id: detail.id, title: detail.title, route: detail.route, status: 'draft' as const} : page);
      setPages(next);
      if (next.some(item => !item.id)) {onNavigate('/admin/site-pages'); setStage('add-page');} else void beginNavigation(next);
    };
    window.addEventListener('nk-admin-guide:page-saved', saved);
    return () => window.removeEventListener('nk-admin-guide:page-saved', saved);
  }, [beginNavigation, onNavigate, pages, stage]);

  useEffect(() => {
    const saved = (event: Event) => {
      const item = (event as CustomEvent<NavigationItem>).detail;
      if (stage === 'nav-save' && item?.menu === 'primary') {
        const nextCursor = navCursor + 1;
        if (nextCursor < navQueue.length) {setNavCursor(nextCursor); setStage('nav-open');} else beginContent(pages);
      } else if (stage === 'footer-save' && item?.menu === 'footer-company') beginSettings();
    };
    window.addEventListener('nk-admin-guide:navigation-saved', saved);
    return () => window.removeEventListener('nk-admin-guide:navigation-saved', saved);
  }, [beginContent, beginSettings, navCursor, navQueue.length, pages, stage]);

  useEffect(() => {
    const action = (event: Event) => {
      const detail = (event as CustomEvent<{recordId: string; action: string; componentType?: PageComponentType}>).detail;
      if (!currentContentPage || detail?.recordId !== currentContentPage.id) return;
      if (stage === 'content-section' && detail.action === 'section') {setComponentIndex(0); setStage('content-component'); return;}
      if (stage !== 'content-component' || detail.action !== 'component' || detail.componentType !== currentComponent) return;
      const next = componentIndex + 1;
      if (next < currentRecipe.length) setComponentIndex(next); else setStage('content-page-done');
    };
    window.addEventListener('nk-admin-guide:editor-action', action);
    return () => window.removeEventListener('nk-admin-guide:editor-action', action);
  }, [componentIndex, currentComponent, currentContentPage, currentRecipe.length, stage]);

  useEffect(() => {
    const published = (event: Event) => {
      if (stage !== 'publish') return;
      const detail = (event as CustomEvent<{id: string}>).detail;
      if (detail?.id !== currentPublishPage?.id) return;
      const next = publishCursor + 1;
      setPages(current => current.map(page => page.id === detail.id ? {...page, status: 'published'} : page));
      if (next < publishQueue.length) {setPublishCursor(next); onNavigate(`/admin/site-pages?record=${encodeURIComponent(publishQueue[next].id)}`);} else setStage('done');
    };
    window.addEventListener('nk-admin-guide:page-published', published);
    return () => window.removeEventListener('nk-admin-guide:page-published', published);
  }, [currentPublishPage?.id, onNavigate, publishCursor, publishQueue, stage]);

  const nextContentPage = () => {
    const next = contentIndex + 1;
    if (next < contentPages.length) {setContentIndex(next); setComponentIndex(0); setStage('content-section'); onNavigate(`/admin/pages?record=${encodeURIComponent(contentPages[next].id)}`);} else void beginFooter();
  };
  const publishAll = () => {
    const queue = pages.filter(page => page.id && page.status !== 'published');
    if (!queue.length) {setStage('done'); return;}
    setPublishQueue(queue); setPublishCursor(0); setStage('publish'); onNavigate(`/admin/site-pages?record=${encodeURIComponent(queue[0].id)}`);
  };

  const selector = useMemo(() => {
    if (stage === 'add-page') return '[data-guide="add-page"]';
    if (stage === 'page-title') return '[data-guide="page-title"]';
    if (stage === 'page-save') return '[data-guide="create-page"]';
    if (stage === 'nav-open') return '[data-guide="new-primary-navigation-link"]';
    if (stage === 'footer-open') return '.nk-admin-navigation-embedded [data-guide="new-navigation-link"]';
    if (stage === 'nav-label' || stage === 'footer-label') return '[data-guide="navigation-label"]';
    if (stage === 'nav-url' || stage === 'footer-url') return '[data-guide="navigation-url"]';
    if (stage === 'nav-save' || stage === 'footer-save') return '[data-guide="save-navigation-link"]';
    if (stage === 'content-section') return '[data-guide="add-section"]';
    if (stage === 'content-component') return `[data-guide="add-component-${currentComponent}"]`;
    if (stage === 'footer-menu') return '[data-guide="navigation-tab-footer-company"]';
    if (stage === 'settings-tab') return '[data-guide="settings-tab-layout"]';
    if (stage === 'settings-review') return '[data-guide="header-footer-settings"]';
    if (stage === 'publish') return '[data-guide="publish-page"]';
    return '';
  }, [currentComponent, stage]);

  useEffect(() => {
    if (!open || !selector) return;
    let bound: HTMLElement | null = null;
    let inputHandler: (() => void) | null = null;
    let clickHandler: (() => void) | null = null;
    const unbind = () => {
      if (!bound) return;
      bound.classList.remove('nk-beginner-guide-target');
      if (inputHandler) bound.removeEventListener('input', inputHandler);
      if (clickHandler) bound.removeEventListener('click', clickHandler);
      bound = null; inputHandler = null; clickHandler = null;
    };
    const bind = () => {
      const found = document.querySelector<HTMLElement>(selector);
      if (!found || found === bound) return;
      unbind(); bound = found; targetRef.current = found; found.classList.add('nk-beginner-guide-target');
      const targetBox = found.getBoundingClientRect(); setCoachSide(targetBox.left + targetBox.width / 2 > window.innerWidth / 2 ? 'left' : 'right');
      found.scrollIntoView({behavior: 'smooth', block: 'center', inline: 'nearest'});
      if (stage === 'add-page') clickHandler = () => window.setTimeout(() => setStage('page-title'), 80);
      if (stage === 'page-title') inputHandler = () => {if ((found as HTMLInputElement).value.trim()) setStage('page-save');};
      if (stage === 'nav-open') clickHandler = () => window.setTimeout(() => setStage('nav-label'), 80);
      if (stage === 'nav-label') inputHandler = () => {if ((found as HTMLInputElement).value.trim()) setStage('nav-url');};
      if (stage === 'nav-url') inputHandler = () => {if ((found as HTMLInputElement).value.trim() === currentNavPage?.route) setStage('nav-save');};
      if (stage === 'footer-menu') clickHandler = () => window.setTimeout(() => setStage('footer-open'), 80);
      if (stage === 'footer-open') clickHandler = () => window.setTimeout(() => setStage('footer-label'), 80);
      if (stage === 'footer-label') inputHandler = () => {if ((found as HTMLInputElement).value.trim()) setStage('footer-url');};
      if (stage === 'footer-url') inputHandler = () => {if ((found as HTMLInputElement).value.trim() === contactPage?.route) setStage('footer-save');};
      if (stage === 'settings-tab') clickHandler = () => window.setTimeout(() => setStage('settings-review'), 80);
      if (inputHandler) {found.addEventListener('input', inputHandler); inputHandler();}
      if (clickHandler) found.addEventListener('click', clickHandler);
    };
    bind(); const observer = new MutationObserver(bind); observer.observe(document.body, {childList: true, subtree: true}); const timer = window.setInterval(bind, 350);
    return () => {observer.disconnect(); window.clearInterval(timer); unbind(); targetRef.current = null;};
  }, [contactPage?.route, currentNavPage?.route, open, selector, stage]);

  if (!open) return null;
  if (stage === 'intro') return <div className="nk-beginner-guide-overlay is-intro"><section className="nk-beginner-guide-intro" role="dialog" aria-modal="true" aria-labelledby="beginner-guide-title"><header><div><Bot/><b>{t(language, 'ΟΔΗΓΟΣ ΝΕΟΥ SITE', 'NEW WEBSITE GUIDE')}</b></div><button type="button" onClick={onClose} aria-label={t(language, 'Κλείσιμο', 'Close')}><X/></button></header><main><div className="nk-beginner-guide-language"><button className={language === 'el' ? 'active' : ''} onClick={() => setLanguage('el')}>Ελληνικά</button><button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>English</button></div><Sparkles/><small>{t(language, 'ΑΠΟ ΤΟ ΜΗΔΕΝ, ΒΗΜΑ-ΒΗΜΑ', 'FROM ZERO, STEP BY STEP')}</small><h2 id="beginner-guide-title">{t(language, 'Θα φτιάξουμε μαζί ολόκληρο το site.', 'We will build the whole website together.')}</h2><p>{t(language, 'Δεν χρειάζεται να γνωρίζεις τεχνικούς όρους. Θα φωτίζω μόνο το επόμενο κουμπί που χρειάζεσαι και εσύ θα μαθαίνεις κάνοντάς το.', 'You do not need to know technical terms. I will highlight only the next button you need, so you learn by doing.')}</p><div className="nk-beginner-guide-plan">{pageDefinitions.map((page, index) => <div key={page.key}><span>{index + 1}</span><b>{page.title}</b><small>{t(language, ({home: 'Η πρώτη σελίδα', gallery: 'Φωτογραφίες', projects: 'Ολοκληρωμένες δουλειές', about: 'Η επιχείρησή σου', contact: 'Τρόποι επικοινωνίας'} as const)[page.key], ({home: 'Your first page', gallery: 'Your photos', projects: 'Completed work', about: 'Your business', contact: 'How people reach you'} as const)[page.key])}</small></div>)}</div><p className="nk-beginner-guide-safe"><CheckCircle2/>{t(language, 'Οι υπάρχουσες σελίδες δεν διαγράφονται. Ο οδηγός χρησιμοποιεί όσες υπάρχουν και ζητά μόνο όσες λείπουν.', 'Existing pages are never deleted. The guide uses what is already there and asks only for what is missing.')}</p></main><footer><button type="button" onClick={() => void start()}><Sparkles/>{t(language, 'Ξεκίνα το site μου', 'Start my website')}</button></footer></section></div>;

  const group = ['add-page', 'page-title', 'page-save'].includes(stage) ? 1 : ['nav-open', 'nav-label', 'nav-url', 'nav-save'].includes(stage) ? 2 : ['content-section', 'content-component', 'content-page-done'].includes(stage) ? 3 : ['footer-menu', 'footer-open', 'footer-label', 'footer-url', 'footer-save'].includes(stage) ? 4 : ['settings-tab', 'settings-review'].includes(stage) ? 5 : 6;
  const copy = coachCopy(stage, language, {missingPage, currentNavPage, currentContentPage, currentComponent, contactPage, currentPublishPage});
  return <div className="nk-beginner-guide-overlay is-coach"><section className={`nk-beginner-guide-coach is-${coachSide}`} role="dialog" aria-modal="false" aria-live="polite"><header><span><Bot/><b>{t(language, 'ΟΔΗΓΟΣ SITE', 'SITE GUIDE')}</b></span><button type="button" onClick={onClose} aria-label={t(language, 'Παύση οδηγού', 'Pause guide')}><X/></button></header><div className="nk-beginner-guide-progress"><span style={{width: `${Math.max(8, group / 6 * 100)}%`}}/><small>{t(language, `Στάδιο ${group} από 6`, `Stage ${group} of 6`)}</small></div><main>{stage === 'loading' ? <LoaderCircle className="nk-admin-spin"/> : copy.icon}<small>{copy.eyebrow}</small><h2>{copy.title}</h2><p>{stage === 'error' && failure ? failure : copy.body}</p>{stage !== 'error' && <div className="nk-beginner-guide-page-list">{pages.map(page => <span className={page.id ? 'done' : page.key === missingPage?.key ? 'current' : ''} key={page.key}>{page.id ? <Check/> : null}{page.suggestedTitle}</span>)}</div>}</main><footer>{stage === 'content-page-done' && <button type="button" onClick={nextContentPage}><Sparkles/>{contentIndex + 1 < contentPages.length ? t(language, 'Επόμενη σελίδα', 'Next page') : t(language, 'Ρύθμιση footer', 'Set up footer')}</button>}{stage === 'settings-review' && <button type="button" onClick={() => setStage('review')}><CheckCircle2/>{t(language, 'Header και footer έτοιμα', 'Header and footer are ready')}</button>}{stage === 'review' && <div><button className="secondary" type="button" onClick={() => setStage('done')}><Save/>{t(language, 'Κράτησέ τα ως πρόχειρα', 'Keep as drafts')}</button><button type="button" onClick={publishAll}><Rocket/>{t(language, 'Δημοσίευσε τις σελίδες', 'Publish the pages')}</button></div>}{stage === 'done' && <button type="button" onClick={onClose}><CheckCircle2/>{t(language, 'Τέλος', 'Done')}</button>}{stage === 'error' && <button type="button" onClick={() => {setFailure(''); setStage('intro');}}><Sparkles/>{t(language, 'Ξεκίνα ξανά', 'Start again')}</button>}</footer></section></div>;
}

function coachCopy(stage: Stage, language: Language, context: {missingPage?: GuidePage; currentNavPage?: GuidePage; currentContentPage?: GuidePage; currentComponent?: PageComponentType; contactPage?: GuidePage; currentPublishPage?: GuidePage}) {
  const {missingPage, currentNavPage, currentContentPage, currentComponent, contactPage, currentPublishPage} = context;
  if (stage === 'loading') return {icon: <LoaderCircle/>, eyebrow: t(language, 'ΜΙΑ ΣΤΙΓΜΗ', 'ONE MOMENT'), title: t(language, 'Ελέγχω τι υπάρχει ήδη…', 'Checking what is already there…'), body: t(language, 'Δεν αλλάζω ούτε διαγράφω υπάρχον περιεχόμενο.', 'I am not changing or deleting existing content.')};
  if (stage === 'add-page') return {icon: <FilePlus2/>, eyebrow: t(language, 'ΣΕΛΙΔΕΣ', 'PAGES'), title: t(language, `Φτιάξε τη σελίδα “${missingPage?.suggestedTitle}”.`, `Create the “${missingPage?.suggestedTitle}” page.`), body: t(language, 'Πάτησε το φωτισμένο “+ Add page”. Μετά θα σου δείξω ακριβώς πού γράφεις το όνομα.', 'Click the highlighted “+ Add page”. Then I will show you exactly where to type the name.')};
  if (stage === 'page-title') return {icon: <Type/>, eyebrow: t(language, 'ΟΝΟΜΑ ΣΕΛΙΔΑΣ', 'PAGE NAME'), title: t(language, `Γράψε “${missingPage?.suggestedTitle}”.`, `Type “${missingPage?.suggestedTitle}”.`), body: t(language, 'Μπορείς να χρησιμοποιήσεις άλλο όνομα αν ταιριάζει καλύτερα στην επιχείρησή σου.', 'You can use a different name if it suits your business better.')};
  if (stage === 'page-save') return {icon: <Save/>, eyebrow: t(language, 'ΑΠΟΘΗΚΕΥΣΗ', 'SAVE'), title: t(language, 'Αποθήκευσε τη νέα σελίδα.', 'Save the new page.'), body: t(language, 'Θα μείνει πρόχειρη. Δεν είναι ακόμη ορατή στους επισκέπτες.', 'It will remain a draft and is not visible to visitors yet.')};
  if (stage === 'nav-open') return {icon: <PanelTop/>, eyebrow: t(language, 'ΕΠΑΝΩ ΜΕΝΟΥ', 'TOP MENU'), title: t(language, `Βάλε το “${currentNavPage?.title}” στο επάνω μενού.`, `Put “${currentNavPage?.title}” in the top menu.`), body: t(language, 'Πάτησε το φωτισμένο “New navigation link”. Το header θα χρησιμοποιήσει αυτό το μενού αυτόματα.', 'Click the highlighted “New navigation link”. The header will use this menu automatically.')};
  if (stage === 'nav-label') return {icon: <ListTree/>, eyebrow: t(language, 'ΚΕΙΜΕΝΟ ΣΤΟ ΜΕΝΟΥ', 'MENU TEXT'), title: t(language, `Γράψε “${currentNavPage?.title}”.`, `Type “${currentNavPage?.title}”.`), body: t(language, 'Αυτό είναι το όνομα που θα βλέπει ο επισκέπτης στο header.', 'This is the name visitors will see in the header.')};
  if (stage === 'nav-url') return {icon: <ListTree/>, eyebrow: t(language, 'ΠΟΥ ΟΔΗΓΕΙ', 'LINK DESTINATION'), title: t(language, `Γράψε ${currentNavPage?.route}.`, `Type ${currentNavPage?.route}.`), body: t(language, 'Αυτό συνδέει το μενού με τη σωστή σελίδα.', 'This connects the menu to the correct page.')};
  if (stage === 'nav-save') return {icon: <Save/>, eyebrow: t(language, 'ΑΠΟΘΗΚΕΥΣΗ LINK', 'SAVE LINK'), title: t(language, 'Αποθήκευσε το link.', 'Save the link.'), body: t(language, 'Μετά θα συνεχίσουμε αυτόματα με την επόμενη σελίδα.', 'We will then continue automatically with the next page.')};
  if (stage === 'content-section') return {icon: <LayoutTemplate/>, eyebrow: t(language, 'ΠΕΡΙΕΧΟΜΕΝΟ', 'CONTENT'), title: t(language, `Ξεκινάμε το “${currentContentPage?.title}”.`, `Let’s start “${currentContentPage?.title}”.`), body: t(language, 'Πάτησε το φωτισμένο “+ Section”. Είναι ένα νέο κομμάτι της σελίδας.', 'Click the highlighted “+ Section”. It is a new part of the page.')};
  if (stage === 'content-component') return {icon: currentComponent === 'image' || currentComponent === 'gallery' ? <ImageIcon/> : <Type/>, eyebrow: t(language, 'ΕΠΟΜΕΝΟ ΣΤΟΙΧΕΙΟ', 'NEXT ITEM'), title: t(language, `Πρόσθεσε ${componentName(language, currentComponent)}.`, `Add a ${componentName(language, currentComponent)}.`), body: t(language, 'Πάτησε το φωτισμένο κουμπί. Μετά μπορείς να αλλάξεις το περιεχόμενο απευθείας στην προεπισκόπηση.', 'Click the highlighted button. You can then change it directly in the preview.')};
  if (stage === 'content-page-done') return {icon: <CheckCircle2/>, eyebrow: t(language, 'Η ΒΑΣΗ ΕΙΝΑΙ ΕΤΟΙΜΗ', 'THE FOUNDATION IS READY'), title: t(language, `Το “${currentContentPage?.title}” έχει τη βασική του δομή.`, `“${currentContentPage?.title}” has its basic structure.`), body: t(language, 'Οι αλλαγές αποθηκεύονται ως πρόχειρο. Συνέχισε στην επόμενη σελίδα όταν είσαι έτοιμος.', 'Changes are saved as a draft. Continue to the next page when you are ready.')};
  if (stage === 'footer-menu') return {icon: <PanelBottom/>, eyebrow: 'FOOTER', title: t(language, 'Άνοιξε το “Footer · Company”.', 'Open “Footer · Company”.'), body: t(language, 'Το φωτισμένο tab ελέγχει τα links στο κάτω μέρος κάθε σελίδας.', 'The highlighted tab controls links at the bottom of every page.')};
  if (stage === 'footer-open') return {icon: <PanelBottom/>, eyebrow: 'FOOTER', title: t(language, 'Πρόσθεσε το Contact στο footer.', 'Add Contact to the footer.'), body: t(language, 'Πάτησε το φωτισμένο “Add link”.', 'Click the highlighted “Add link”.')};
  if (stage === 'footer-label') return {icon: <Type/>, eyebrow: 'FOOTER', title: t(language, `Γράψε “${contactPage?.title || 'Contact'}”.`, `Type “${contactPage?.title || 'Contact'}”.`), body: t(language, 'Αυτό θα εμφανίζεται στο κάτω μενού.', 'This will appear in the footer menu.')};
  if (stage === 'footer-url') return {icon: <ListTree/>, eyebrow: 'FOOTER', title: t(language, `Γράψε ${contactPage?.route || '/contact'}.`, `Type ${contactPage?.route || '/contact'}.`), body: t(language, 'Το footer θα οδηγεί στη σελίδα επικοινωνίας.', 'The footer will lead to the Contact page.')};
  if (stage === 'footer-save') return {icon: <Save/>, eyebrow: 'FOOTER', title: t(language, 'Αποθήκευσε το link του footer.', 'Save the footer link.'), body: t(language, 'Μετά θα ελέγξουμε την εμφάνιση του header και του footer.', 'Next we will review the header and footer appearance.')};
  if (stage === 'settings-tab') return {icon: <LayoutTemplate/>, eyebrow: t(language, 'ΕΜΦΑΝΙΣΗ SITE', 'SITE LAYOUT'), title: t(language, 'Άνοιξε το “Header and footer”.', 'Open “Header and footer”.'), body: t(language, 'Εδώ ρυθμίζεις logo, κουμπί επικοινωνίας, στοιχεία footer και τι εμφανίζεται παντού.', 'Here you control the logo, contact button, footer information and what appears everywhere.')};
  if (stage === 'settings-review') return {icon: <LayoutTemplate/>, eyebrow: t(language, 'ΤΕΛΙΚΟΣ ΕΛΕΓΧΟΣ', 'FINAL CHECK'), title: t(language, 'Έλεγξε το header και το footer.', 'Review the header and footer.'), body: t(language, 'Άλλαξε μόνο ό,τι χρειάζεσαι. Αν κάνεις αλλαγή, πάτησε “Save draft” πριν συνεχίσεις.', 'Change only what you need. If you make a change, click “Save draft” before continuing.')};
  if (stage === 'review') return {icon: <CheckCircle2/>, eyebrow: t(language, 'ΤΟ SITE ΕΙΝΑΙ ΕΤΟΙΜΟ ΓΙΑ ΕΛΕΓΧΟ', 'THE SITE IS READY TO REVIEW'), title: t(language, 'Τώρα αποφασίζεις τι θα γίνει.', 'Now you decide what happens next.'), body: t(language, 'Μπορείς να κρατήσεις όλες τις σελίδες ως πρόχειρα ή να τις δημοσιεύσεις μία-μία με τη βοήθειά μου.', 'You can keep every page as a draft or publish them one by one with my help.')};
  if (stage === 'publish') return {icon: <Rocket/>, eyebrow: t(language, 'ΔΗΜΟΣΙΕΥΣΗ', 'PUBLISH'), title: t(language, `Δημοσίευσε το “${currentPublishPage?.title}”.`, `Publish “${currentPublishPage?.title}”.`), body: t(language, 'Πάτησε το φωτισμένο “Publish”. Μετά θα ανοίξω αυτόματα την επόμενη σελίδα.', 'Click the highlighted “Publish”. I will then open the next page automatically.')};
  if (stage === 'done') return {icon: <CheckCircle2/>, eyebrow: t(language, 'ΟΛΟΚΛΗΡΩΘΗΚΕ', 'COMPLETE'), title: t(language, 'Έστησες ένα ολόκληρο site.', 'You built a complete website.'), body: t(language, 'Έχεις σελίδες, επάνω navigation, footer και βασικό περιεχόμενο. Μπορείς να επιστρέψεις οποιαδήποτε στιγμή και να συνεχίσεις την επεξεργασία.', 'You have pages, top navigation, a footer and essential content. You can return at any time and keep editing.')};
  return {icon: <X/>, eyebrow: t(language, 'ΧΡΕΙΑΖΕΤΑΙ ΒΟΗΘΕΙΑ', 'HELP NEEDED'), title: t(language, 'Ο οδηγός σταμάτησε σε αυτό το βήμα.', 'The guide stopped at this step.'), body: t(language, 'Καμία υπάρχουσα σελίδα δεν διαγράφηκε. Μπορείς να ξεκινήσεις ξανά.', 'No existing page was deleted. You can start again.')};
}
