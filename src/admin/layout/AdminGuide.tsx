import {useCallback, useEffect, useRef, useState} from 'react';
import {Bot, CheckCircle2, ChevronRight, Eye, Languages, LoaderCircle, Map, RefreshCw, Save, ShieldCheck, Sparkles, Trash2, X} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {errorMessage} from '../api';
import {applyCmsGuideStep, finishCmsGuide, requestCmsGuideStart, requestCmsGuideStep, type CmsGuideLanguage, type CmsGuideSession, type CmsGuideStepResult} from '../guide/aiGuide';

const copy = {
  el: {
    title: 'AI ΒΟΗΘΟΣ ΣΕΛΙΔΑΣ', close: 'Κλείσιμο έξυπνου βοηθού', badge: 'ΖΩΝΤΑΝΗ ΚΑΤΑΣΚΕΥΗ', safe: 'Ξεχωριστό draft · πραγματικά components · διαθέσιμο Undo',
    introTitle: 'Ας χτίσουμε μια σελίδα μαζί.', intro: 'Θα ανοίξω μια κενή σελίδα. Πρώτα θα βάλουμε το section που κρατά το περιεχόμενο, μετά τον τίτλο και έπειτα το κείμενο. Θα βλέπεις κάθε στοιχείο να μπαίνει live μπροστά σου.',
    start: 'Ξεκίνησε διαδραστικό οδηγό', returnEditor: 'Επιστροφή στον editor', starting: 'Ετοιμάζω τον κενό καμβά…', startingBody: 'Δημιουργείται ένα ξεχωριστό draft. Καμία υπάρχουσα σελίδα δεν αλλάζει.',
    readyTitle: 'Ο κενός καμβάς είναι έτοιμος.', readyBody: 'Αναλύω αμέσως τη σελίδα και ετοιμάζω την πρώτη χρήσιμη προσθήκη.', analyse: 'Βρίσκω το επόμενο στοιχείο', analysing: 'Κοιτάζω τη σελίδα όπως είναι τώρα…', analysingBody: 'Ελέγχω τη δομή, τη σειρά και την οπτική ισορροπία. Δεν χρειάζεται να πατήσεις κάτι ακόμη.',
    proposal: 'ΕΠΟΜΕΝΟ LIVE ΣΤΟΙΧΕΙΟ', why: 'Γιατί ακολουθεί τώρα', change: 'Πώς θα το αλλάξεις μετά', reanalyse: 'Νέα ανάλυση', manual: 'Το έβαλα/άλλαξα εγώ — έλεγξέ το', applying: 'Το προσθέτω live στο preview…',
    added: 'LIVE ΣΤΟ PREVIEW', addedHint: 'Το στοιχείο προστέθηκε πραγματικά, επιλέχθηκε και φωτίζεται τώρα στον καμβά.', next: 'Βρες το επόμενο στοιχείο', finish: 'Τέλος για τώρα',
    completeTitle: 'Η demo σελίδα είναι έτοιμη για την απόφασή σου.', completeBody: 'Μπορείς να την κρατήσεις ως κανονικό draft και να συνεχίσεις μόνος σου ή να τη διαγράψεις ολόκληρη και να ξεκινήσεις με νέο κενό καμβά.', keep: 'Κράτησε τη σελίδα', restart: 'Διαγραφή & νέο ξεκίνημα', finishing: 'Τακτοποιώ τη demo σελίδα…',
    keptTitle: 'Η σελίδα κρατήθηκε ως draft.', keptBody: 'Δεν δημοσιεύτηκε. Παραμένει στον Website Editor και μπορείς να συνεχίσεις με τα ίδια εργαλεία, drag-and-drop και Undo.', done: 'Τέλος', error: 'Δεν ολοκληρώθηκε αυτό το βήμα', retry: 'Δοκιμή ξανά',
  },
  en: {
    title: 'AI PAGE ASSISTANT', close: 'Close smart assistant', badge: 'LIVE BUILD', safe: 'Separate draft · real components · Undo available',
    introTitle: "Let's build a page together.", intro: 'I will open a blank page. First we add the section that holds the content, then its heading, and then its text. You will see every element appear live in front of you.',
    start: 'Start interactive guide', returnEditor: 'Return to editor', starting: 'Preparing the blank canvas…', startingBody: 'A separate draft is being created. No existing page is changed.',
    readyTitle: 'Your blank canvas is ready.', readyBody: 'I am analysing it immediately and preparing the first useful addition.', analyse: 'Finding the next element', analysing: 'Reading the page as it is now…', analysingBody: 'I am checking structure, order and visual balance. You do not need to click anything yet.',
    proposal: 'NEXT LIVE ELEMENT', why: 'Why it follows now', change: 'How to change it afterwards', reanalyse: 'Analyse again', manual: 'I added/changed it — check again', applying: 'Adding it live to the preview…',
    added: 'LIVE IN THE PREVIEW', addedHint: 'The element was really added, selected and is highlighted on the canvas now.', next: 'Find the next element', finish: 'Finish here',
    completeTitle: 'Your demo page is ready for your decision.', completeBody: 'Keep it as a normal draft and continue on your own, or delete the entire demo and begin with a new blank canvas.', keep: 'Keep this page', restart: 'Delete & start over', finishing: 'Tidying up the demo page…',
    keptTitle: 'The page is now a normal draft.', keptBody: 'It was not published. It remains in the Website Editor with the same tools, drag and drop, and Undo.', done: 'Done', error: 'This step was not completed', retry: 'Try again',
  },
} as const;

type Phase = 'intro' | 'starting' | 'ready' | 'analysing' | 'proposal' | 'applying' | 'complete' | 'finishing' | 'kept' | 'error';

function actionLabel(result: CmsGuideStepResult, language: CmsGuideLanguage) {
  if (result.proposal.action === 'insert_section') return language === 'el' ? 'Πρόσθεσε section live' : 'Add section live';
  const labels = language === 'el'
    ? {heading: 'Πρόσθεσε τίτλο', text: 'Πρόσθεσε παράγραφο', image: 'Πρόσθεσε εικόνα', gallery: 'Πρόσθεσε gallery', button: 'Πρόσθεσε κουμπί', icon: 'Πρόσθεσε εικονίδιο', divider: 'Πρόσθεσε διαχωριστικό'}
    : {heading: 'Add heading', text: 'Add paragraph', image: 'Add image', gallery: 'Add gallery', button: 'Add button', icon: 'Add icon', divider: 'Add divider'};
  return labels[result.proposal.component.type];
}

function appliedReceiptLabel(result: CmsGuideStepResult, language: CmsGuideLanguage) {
  if (result.proposal.action === 'insert_section') return language === 'el'
    ? 'Το section προστέθηκε live. Πάτησέ το στο preview για να το αλλάξεις.'
    : 'The section was added live. Select it in the preview to change it.';
  const labels = language === 'el'
    ? {heading: 'Ο τίτλος', text: 'Η παράγραφος', image: 'Η εικόνα', gallery: 'Η συλλογή εικόνων', button: 'Το κουμπί', icon: 'Το εικονίδιο', divider: 'Ο διαχωριστής'}
    : {heading: 'The heading', text: 'The paragraph', image: 'The image', gallery: 'The gallery', button: 'The button', icon: 'The icon', divider: 'The divider'};
  const label = labels[result.proposal.component.type];
  return language === 'el'
    ? `${label} προστέθηκε live. Πάτησέ το στο preview για να το αλλάξεις.`
    : `${label} was added live. Select it in the preview to change it.`;
}

export function AdminGuide({open, onClose, onNavigate}: {open: boolean; onClose: () => void; onNavigate: (to: string) => void}) {
  const location = useLocation();
  const [language, setLanguage] = useState<CmsGuideLanguage>(() => localStorage.getItem('nk-admin-guide-language') === 'en' ? 'en' : 'el');
  const [phase, setPhase] = useState<Phase>('intro');
  const [step, setStep] = useState(0);
  const [session, setSession] = useState<CmsGuideSession | null>(null);
  const [result, setResult] = useState<CmsGuideStepResult | null>(null);
  const [lastApplied, setLastApplied] = useState<CmsGuideStepResult | null>(null);
  const [failure, setFailure] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const pendingStartRef = useRef(false);
  const inEditor = location.pathname === '/admin/pages';
  const text = copy[language];
  const closeGuide = useCallback(() => {
    if (phase === 'kept') {
      setPhase('intro');
      setStep(0);
      setResult(null);
      setLastApplied(null);
      setFailure('');
    }
    onClose();
  }, [onClose, phase]);

  useEffect(() => {localStorage.setItem('nk-admin-guide-language', language);}, [language]);
  useEffect(() => {if (open) window.setTimeout(() => closeRef.current?.focus(), 0);}, [open]);
  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && panelRef.current?.contains(document.activeElement)) closeGuide();
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [closeGuide, open]);
  useEffect(() => {
    if (!open || !['proposal', 'complete'].includes(phase)) return;
    panelRef.current?.querySelector('main')?.scrollTo({top: 0, behavior: 'smooth'});
  }, [open, phase, step]);
  useEffect(() => {
    if (!open || !inEditor || !window.matchMedia('(max-width: 520px)').matches || !['ready', 'analysing', 'proposal', 'applying', 'complete'].includes(phase)) return;
    const revealStage = () => {
      const stage = document.querySelector<HTMLElement>('.nk-visual-stage');
      if (!stage) return;
      const top = stage.getBoundingClientRect().top + window.scrollY - 8;
      window.scrollTo({top: Math.max(0, top), behavior: 'auto'});
    };
    const timer = window.setTimeout(revealStage, phase === 'ready' ? 240 : 60);
    const settledTimer = window.setTimeout(revealStage, phase === 'ready' ? 520 : 420);
    return () => {window.clearTimeout(timer); window.clearTimeout(settledTimer);};
  }, [inEditor, open, phase, step]);

  const startInEditor = useCallback(async () => {
    setPhase('starting'); setFailure(''); setResult(null); setLastApplied(null); setStep(0);
    try {
      const started = await requestCmsGuideStart(language);
      setSession(started.session);
      setPhase('ready');
    } catch (error) {setFailure(errorMessage(error)); setPhase('error');}
  }, [language]);

  useEffect(() => {
    if (!open || !inEditor || !pendingStartRef.current) return;
    pendingStartRef.current = false;
    const timer = window.setTimeout(() => void startInEditor(), 0);
    return () => window.clearTimeout(timer);
  }, [inEditor, open, startInEditor]);

  const start = () => {
    if (inEditor) {void startInEditor(); return;}
    pendingStartRef.current = true;
    onNavigate('/admin/pages');
  };
  const analyse = useCallback(async () => {
    setPhase('analysing'); setFailure('');
    try {
      const next = await requestCmsGuideStep(language);
      setResult(next);
      setPhase(next.proposal.action === 'complete' ? 'complete' : 'proposal');
    } catch (error) {setFailure(errorMessage(error)); setPhase('error');}
  }, [language]);
  useEffect(() => {
    if (!open || !inEditor || phase !== 'ready' || !session) return;
    const timer = window.setTimeout(() => void analyse(), 180);
    return () => window.clearTimeout(timer);
  }, [analyse, inEditor, open, phase, session]);
  const apply = async () => {
    if (!result) return;
    setPhase('applying'); setFailure('');
    try {
      const applied = await applyCmsGuideStep(result.proposal, result.context);
      setLastApplied(applied); setStep(current => current + 1);
      await analyse();
    } catch (error) {setFailure(errorMessage(error)); setPhase('error');}
  };
  const checkManualChange = () => {setLastApplied(null); void analyse();};
  const keep = async () => {
    setPhase('finishing'); setFailure('');
    try {await finishCmsGuide('keep'); setSession(null); setPhase('kept');}
    catch (error) {setFailure(errorMessage(error)); setPhase('error');}
  };
  const restart = async () => {
    setPhase('finishing'); setFailure('');
    try {await finishCmsGuide('discard'); setSession(null); await startInEditor();}
    catch (error) {setFailure(errorMessage(error)); setPhase('error');}
  };

  if (!open) return null;
  const loading = ['starting', 'analysing', 'applying', 'finishing'].includes(phase);
  return <div className="nk-admin-guide-overlay nk-admin-ai-guide-overlay" role="presentation">
    <div className="nk-admin-ai-guide-preview-label" aria-hidden="true"><Eye/>{language === 'el' ? 'LIVE PREVIEW ΠΑΝΩ' : 'LIVE PREVIEW ABOVE'}</div>
    <section ref={panelRef} className="nk-admin-guide nk-admin-ai-guide" role="dialog" aria-modal="false" aria-labelledby="admin-guide-title">
      <header><div><Bot/><span>{text.title}</span></div><button ref={closeRef} type="button" onClick={closeGuide} aria-label={text.close}><X/></button></header>
      <div className="nk-admin-guide-language" aria-label="Guide language"><Languages/><button type="button" className={language === 'el' ? 'active' : ''} aria-pressed={language === 'el'} onClick={() => setLanguage('el')}>Ελληνικά</button><button type="button" className={language === 'en' ? 'active' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button></div>
      <div className="nk-admin-ai-guide-step"><Sparkles/><span>{text.badge}{session ? ` · ${String(step + 1).padStart(2, '0')}` : ''}</span><b>{text.safe}</b></div>
      <main aria-live="polite">
        {lastApplied && !['finishing', 'kept'].includes(phase) && <LiveReceipt result={lastApplied} language={language}/>}
        {!inEditor && session ? <div className="nk-admin-ai-guide-intro"><Map/><small>{text.badge}</small><h2 id="admin-guide-title">{text.readyTitle}</h2><p>{text.readyBody}</p><button type="button" onClick={() => onNavigate('/admin/pages')}>{text.returnEditor}<ChevronRight/></button></div>
          : phase === 'intro' ? <div className="nk-admin-ai-guide-intro"><Bot/><small>{text.badge}</small><h2 id="admin-guide-title">{text.introTitle}</h2><p>{text.intro}</p><div className="nk-admin-ai-safety"><ShieldCheck/><span><b>{text.safe}</b><small>{language === 'el' ? 'Η demo σελίδα δεν δημοσιεύεται ποτέ αυτόματα.' : 'The demo page is never published automatically.'}</small></span></div></div>
          : phase === 'starting' ? <GuideLoading title={text.starting} body={text.startingBody}/>
          : phase === 'ready' ? <div className="nk-admin-ai-guide-intro"><CheckCircle2/><small>{text.badge}</small><h2 id="admin-guide-title">{text.readyTitle}</h2><p>{text.readyBody}</p></div>
          : phase === 'analysing' ? <GuideLoading title={text.analysing} body={text.analysingBody}/>
          : phase === 'applying' ? <GuideLoading title={text.applying} body={language === 'el' ? 'Χρησιμοποιώ την ίδια λειτουργία προσθήκης που χρησιμοποιούν τα κουμπιά και το drag-and-drop του editor.' : 'I am using the same add action as the editor buttons and drag-and-drop.'}/>
          : phase === 'finishing' ? <GuideLoading title={text.finishing} body={language === 'el' ? 'Η επιλογή σου εφαρμόζεται μόνο στην προσωρινή demo σελίδα.' : 'Your choice is being applied only to the temporary demo page.'}/>
          : phase === 'proposal' && result ? <div className="nk-admin-ai-guide-result is-proposal"><Sparkles/><small>{text.proposal} · {String(step + 1).padStart(2, '0')}</small><h2 id="admin-guide-title">{result.proposal.explanation.summary}</h2><GuideRecipe result={result} language={language} onApply={apply}/><section><b>{text.why}</b><p>{result.proposal.explanation.reason}</p></section><section><b>{text.change}</b><p>{result.proposal.explanation.howToChange}</p></section><p className="nk-admin-guide-manual-hint">{language === 'el' ? 'Η πράσινη επιλογή είναι η σωστή για τώρα. Εναλλακτικά, κάνε την αλλαγή μόνος σου στον editor και πάτησε τον έλεγχο από κάτω.' : 'The green option is the right one for now. Alternatively, make the change yourself in the editor and use the check button below.'}</p></div>
          : phase === 'complete' ? <div className="nk-admin-ai-guide-result is-complete"><CheckCircle2/><small>{text.badge}</small><h2 id="admin-guide-title">{text.completeTitle}</h2><p className="nk-admin-guide-added-hint">{text.completeBody}</p></div>
          : phase === 'kept' ? <div className="nk-admin-ai-guide-result is-complete"><Save/><small>{text.added}</small><h2 id="admin-guide-title">{text.keptTitle}</h2><p className="nk-admin-guide-added-hint">{text.keptBody}</p></div>
          : <div className="nk-admin-ai-guide-error" role="alert"><X/><small>{text.error}</small><h2 id="admin-guide-title">{failure}</h2><p>{lastApplied ? (language === 'el' ? 'Το προηγούμενο στοιχείο μπήκε live. Μόνο ο έλεγχος για το επόμενο βήμα χρειάζεται επανάληψη.' : 'The previous element was added live. Only the check for the next step needs to run again.') : (language === 'el' ? 'Δεν εφαρμόστηκε καμία επιπλέον αλλαγή.' : 'No additional change was applied.')}</p></div>}
      </main>
      <footer>
        {phase === 'intro' && <button type="button" onClick={start}><Sparkles/>{text.start}</button>}
        {phase === 'proposal' && result && <button type="button" className="nk-admin-guide-manual-action" onClick={checkManualChange}><RefreshCw/>{text.manual}</button>}
        {phase === 'complete' && <div className="nk-admin-guide-step-actions is-finish"><button className="danger" type="button" onClick={() => void restart()}><Trash2/>{text.restart}</button><button type="button" onClick={() => void keep()}><Save/>{text.keep}</button></div>}
        {phase === 'kept' && <button type="button" onClick={closeGuide}><CheckCircle2/>{text.done}</button>}
        {phase === 'error' && <button type="button" onClick={() => session ? void analyse() : start()}><RefreshCw/>{text.retry}</button>}
        {loading && <button type="button" disabled><LoaderCircle className="nk-admin-spin"/>{phase === 'starting' ? text.starting : phase === 'finishing' ? text.finishing : phase === 'applying' ? text.applying : lastApplied ? (language === 'el' ? 'Μπήκε live · βρίσκω το επόμενο…' : 'Added live · finding the next step…') : text.analysing}</button>}
      </footer>
    </section>
  </div>;
}

function GuideLoading({title, body}: {title: string; body: string}) {
  return <div className="nk-admin-ai-guide-loading"><LoaderCircle className="nk-admin-spin"/><h2 id="admin-guide-title">{title}</h2><p>{body}</p><div><i/><i/><i/></div></div>;
}

function LiveReceipt({result, language}: {result: CmsGuideStepResult; language: CmsGuideLanguage}) {
  return <div className="nk-admin-ai-live-receipt" role="status"><CheckCircle2/><span><small>{language === 'el' ? 'LIVE ΣΤΟ PREVIEW' : 'LIVE IN THE PREVIEW'}</small><b>{appliedReceiptLabel(result, language)}</b></span></div>;
}

type RecipeKey = 'section' | 'heading' | 'text' | 'image' | 'button';

function GuideRecipe({result, language, onApply}: {result: CmsGuideStepResult; language: CmsGuideLanguage; onApply: () => Promise<void>}) {
  const items: Array<{key: RecipeKey; el: string; en: string}> = [
    {key: 'section', el: 'Section', en: 'Section'},
    {key: 'heading', el: 'Τίτλος / Header', en: 'Heading / Header'},
    {key: 'text', el: 'Περιεχόμενο', en: 'Content'},
    {key: 'image', el: 'Εικόνα (προαιρετικό)', en: 'Image (optional)'},
    {key: 'button', el: 'Κουμπί', en: 'Button'},
  ];
  const sections = result.context.page.sections.filter(section => section.enabled !== false);
  const components = sections.flatMap(section => section.components.filter(component => component.enabled !== false));
  const current: RecipeKey | null = result.proposal.action === 'insert_section' ? 'section'
    : result.proposal.action === 'insert_component' && result.proposal.component.type === 'heading' ? 'heading'
    : result.proposal.action === 'insert_component' && result.proposal.component.type === 'text' ? 'text'
    : result.proposal.action === 'insert_component' && ['image', 'gallery'].includes(result.proposal.component.type) ? 'image'
    : result.proposal.action === 'insert_component' && result.proposal.component.type === 'button' ? 'button' : null;
  const completed = (key: RecipeKey) => key === 'section' ? sections.length > 0 : components.some(component => component.type === key || (key === 'image' && component.type === 'gallery'));
  return <div className="nk-admin-guide-recipe" aria-label={language === 'el' ? 'Σειρά κατασκευής σελίδας' : 'Page building sequence'}>{items.map((item, index) => {
    const active = item.key === current;
    const done = !active && completed(item.key);
    return <button key={item.key} type="button" className={active ? 'is-current' : done ? 'is-done' : 'is-locked'} disabled={!active} onClick={() => void onApply()}>
      <span>{done ? <CheckCircle2/> : String(index + 1).padStart(2, '0')}</span>
      <span><b>{language === 'el' ? item.el : item.en}</b><small>{active ? actionLabel(result, language) : done ? (language === 'el' ? 'Μπήκε live' : 'Added live') : (language === 'el' ? 'Ακολουθεί αργότερα' : 'Comes later')}</small></span>
    </button>;
  })}</div>;
}
