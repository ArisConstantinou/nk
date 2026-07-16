import {useCallback, useEffect, useRef, useState} from 'react';
import {ArrowRight, Bot, CheckCircle2, ChevronRight, Languages, LoaderCircle, Map, RefreshCw, Save, ShieldCheck, Sparkles, Trash2, X} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {errorMessage} from '../api';
import {applyCmsGuideStep, finishCmsGuide, requestCmsGuideStart, requestCmsGuideStep, type CmsGuideLanguage, type CmsGuideSession, type CmsGuideStepResult} from '../guide/aiGuide';

const copy = {
  el: {
    title: 'AI ΒΟΗΘΟΣ ΣΕΛΙΔΑΣ', close: 'Κλείσιμο έξυπνου βοηθού', badge: 'ΖΩΝΤΑΝΗ ΚΑΤΑΣΚΕΥΗ', safe: 'Ξεχωριστό draft · πραγματικά components · διαθέσιμο Undo',
    introTitle: 'Ας χτίσουμε μια σελίδα μαζί.', intro: 'Θα ανοίξω έναν εντελώς κενό, προσωρινό καμβά. Πριν από κάθε προσθήκη θα κοιτάζω τι υπάρχει ήδη και θα σου προτείνω μόνο το πιο λογικό επόμενο βήμα.',
    start: 'Ξεκίνησε διαδραστικό οδηγό', returnEditor: 'Επιστροφή στον editor', starting: 'Ετοιμάζω τον κενό καμβά…', startingBody: 'Δημιουργείται ένα ξεχωριστό draft. Καμία υπάρχουσα σελίδα δεν αλλάζει.',
    readyTitle: 'Ο κενός καμβάς είναι έτοιμος.', readyBody: 'Τώρα θα αναλύσω τη σελίδα όπως ακριβώς φαίνεται στον editor και θα επιλέξω την πρώτη χρήσιμη προσθήκη.', analyse: 'Πρότεινε το επόμενο βήμα', analysing: 'Κοιτάζω τη σελίδα όπως είναι τώρα…', analysingBody: 'Ελέγχω τη δομή, τη σειρά και την οπτική ισορροπία πριν προτείνω οτιδήποτε.',
    proposal: 'Η ΠΡΟΤΑΣΗ ΜΟΥ', why: 'Γιατί ταιριάζει εδώ', change: 'Πώς θα το αλλάξεις μετά', reanalyse: 'Νέα ανάλυση', applying: 'Προσθέτω το στοιχείο στον πραγματικό editor…',
    added: 'ΜΠΗΚΕ ΣΤΗ ΣΕΛΙΔΑ', addedHint: 'Το νέο στοιχείο φωτίζεται πάνω στον καμβά. Μπορείς ήδη να το επιλέξεις, να γράψεις μέσα του ή να το μετακινήσεις με drag-and-drop.', next: 'Ανάλυσε το επόμενο βήμα', finish: 'Ολοκλήρωση',
    completeTitle: 'Η demo σελίδα είναι έτοιμη για την απόφασή σου.', completeBody: 'Μπορείς να την κρατήσεις ως κανονικό draft και να συνεχίσεις μόνος σου ή να τη διαγράψεις ολόκληρη και να ξεκινήσεις με νέο κενό καμβά.', keep: 'Κράτησε τη σελίδα', restart: 'Διαγραφή & νέο ξεκίνημα', finishing: 'Τακτοποιώ τη demo σελίδα…',
    keptTitle: 'Η σελίδα κρατήθηκε ως draft.', keptBody: 'Δεν δημοσιεύτηκε. Παραμένει στον Website Editor και μπορείς να συνεχίσεις με τα ίδια εργαλεία, drag-and-drop και Undo.', done: 'Τέλος', error: 'Δεν ολοκληρώθηκε αυτό το βήμα', retry: 'Δοκιμή ξανά',
  },
  en: {
    title: 'AI PAGE ASSISTANT', close: 'Close smart assistant', badge: 'LIVE BUILD', safe: 'Separate draft · real components · Undo available',
    introTitle: "Let's build a page together.", intro: 'I will open a completely blank temporary canvas. Before every addition I will inspect what is already there and suggest only the most logical next step.',
    start: 'Start interactive guide', returnEditor: 'Return to editor', starting: 'Preparing the blank canvas…', startingBody: 'A separate draft is being created. No existing page is changed.',
    readyTitle: 'Your blank canvas is ready.', readyBody: 'I can now analyse the page exactly as it appears in the editor and choose the first useful addition.', analyse: 'Suggest the next step', analysing: 'Reading the page as it is now…', analysingBody: 'I am checking structure, order and visual balance before suggesting anything.',
    proposal: 'MY SUGGESTION', why: 'Why it belongs here', change: 'How to change it afterwards', reanalyse: 'Analyse again', applying: 'Adding it through the real editor…',
    added: 'ADDED TO THE PAGE', addedHint: 'The new element is highlighted on the canvas. You can already select it, type into it, or move it with drag and drop.', next: 'Analyse the next step', finish: 'Finish guide',
    completeTitle: 'Your demo page is ready for your decision.', completeBody: 'Keep it as a normal draft and continue on your own, or delete the entire demo and begin with a new blank canvas.', keep: 'Keep this page', restart: 'Delete & start over', finishing: 'Tidying up the demo page…',
    keptTitle: 'The page is now a normal draft.', keptBody: 'It was not published. It remains in the Website Editor with the same tools, drag and drop, and Undo.', done: 'Done', error: 'This step was not completed', retry: 'Try again',
  },
} as const;

type Phase = 'intro' | 'starting' | 'ready' | 'analysing' | 'proposal' | 'applying' | 'explained' | 'complete' | 'finishing' | 'kept' | 'error';

function actionLabel(result: CmsGuideStepResult, language: CmsGuideLanguage) {
  const labels = language === 'el'
    ? {heading: 'Προσθήκη τίτλου', text: 'Προσθήκη παραγράφου', image: 'Προσθήκη εικόνας', gallery: 'Προσθήκη gallery', button: 'Προσθήκη κουμπιού', icon: 'Προσθήκη εικονιδίου', divider: 'Προσθήκη διαχωριστικού'}
    : {heading: 'Add heading', text: 'Add paragraph', image: 'Add image', gallery: 'Add gallery', button: 'Add button', icon: 'Add icon', divider: 'Add divider'};
  return labels[result.proposal.component.type];
}

export function AdminGuide({open, onClose, onNavigate}: {open: boolean; onClose: () => void; onNavigate: (to: string) => void}) {
  const location = useLocation();
  const [language, setLanguage] = useState<CmsGuideLanguage>(() => localStorage.getItem('nk-admin-guide-language') === 'en' ? 'en' : 'el');
  const [phase, setPhase] = useState<Phase>('intro');
  const [step, setStep] = useState(0);
  const [session, setSession] = useState<CmsGuideSession | null>(null);
  const [result, setResult] = useState<CmsGuideStepResult | null>(null);
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

  const startInEditor = useCallback(async () => {
    setPhase('starting'); setFailure(''); setResult(null); setStep(0);
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
  const analyse = async () => {
    setPhase('analysing'); setFailure('');
    try {
      const next = await requestCmsGuideStep(language);
      setResult(next);
      setPhase(next.proposal.action === 'complete' ? 'complete' : 'proposal');
    } catch (error) {setFailure(errorMessage(error)); setPhase('error');}
  };
  const apply = async () => {
    if (!result) return;
    setPhase('applying'); setFailure('');
    try {
      const applied = await applyCmsGuideStep(result.proposal, result.context);
      setResult(applied); setStep(current => current + 1); setPhase('explained');
    } catch (error) {setFailure(errorMessage(error)); setPhase('error');}
  };
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
    <section ref={panelRef} className="nk-admin-guide nk-admin-ai-guide" role="dialog" aria-modal="false" aria-labelledby="admin-guide-title">
      <header><div><Bot/><span>{text.title}</span></div><button ref={closeRef} type="button" onClick={closeGuide} aria-label={text.close}><X/></button></header>
      <div className="nk-admin-guide-language" aria-label="Guide language"><Languages/><button type="button" className={language === 'el' ? 'active' : ''} aria-pressed={language === 'el'} onClick={() => setLanguage('el')}>Ελληνικά</button><button type="button" className={language === 'en' ? 'active' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button></div>
      <div className="nk-admin-ai-guide-step"><Sparkles/><span>{text.badge}{session ? ` · ${String(step + 1).padStart(2, '0')}` : ''}</span><b>{text.safe}</b></div>
      <main aria-live="polite">
        {!inEditor && session ? <div className="nk-admin-ai-guide-intro"><Map/><small>{text.badge}</small><h2 id="admin-guide-title">{text.readyTitle}</h2><p>{text.readyBody}</p><button type="button" onClick={() => onNavigate('/admin/pages')}>{text.returnEditor}<ChevronRight/></button></div>
          : phase === 'intro' ? <div className="nk-admin-ai-guide-intro"><Bot/><small>{text.badge}</small><h2 id="admin-guide-title">{text.introTitle}</h2><p>{text.intro}</p><div className="nk-admin-ai-safety"><ShieldCheck/><span><b>{text.safe}</b><small>{language === 'el' ? 'Η demo σελίδα δεν δημοσιεύεται ποτέ αυτόματα.' : 'The demo page is never published automatically.'}</small></span></div></div>
          : phase === 'starting' ? <GuideLoading title={text.starting} body={text.startingBody}/>
          : phase === 'ready' ? <div className="nk-admin-ai-guide-intro"><CheckCircle2/><small>{text.badge}</small><h2 id="admin-guide-title">{text.readyTitle}</h2><p>{text.readyBody}</p></div>
          : phase === 'analysing' ? <GuideLoading title={text.analysing} body={text.analysingBody}/>
          : phase === 'applying' ? <GuideLoading title={text.applying} body={language === 'el' ? 'Χρησιμοποιώ την ίδια λειτουργία προσθήκης που χρησιμοποιούν τα κουμπιά και το drag-and-drop του editor.' : 'I am using the same add action as the editor buttons and drag-and-drop.'}/>
          : phase === 'finishing' ? <GuideLoading title={text.finishing} body={language === 'el' ? 'Η επιλογή σου εφαρμόζεται μόνο στην προσωρινή demo σελίδα.' : 'Your choice is being applied only to the temporary demo page.'}/>
          : phase === 'proposal' && result ? <div className="nk-admin-ai-guide-result is-proposal"><Sparkles/><small>{text.proposal}</small><h2 id="admin-guide-title">{result.proposal.explanation.summary}</h2><section><b>{text.why}</b><p>{result.proposal.explanation.reason}</p></section><section><b>{text.change}</b><p>{result.proposal.explanation.howToChange}</p></section>{result.proposal.designNotes.length > 0 && <ul>{result.proposal.designNotes.map(note => <li key={note}>{note}</li>)}</ul>}</div>
          : phase === 'explained' && result ? <div className="nk-admin-ai-guide-result"><CheckCircle2/><small>{text.added}</small><h2 id="admin-guide-title">{result.proposal.explanation.summary}</h2><p className="nk-admin-guide-added-hint">{text.addedHint}</p><section><b>{text.why}</b><p>{result.proposal.explanation.reason}</p></section><section><b>{text.change}</b><p>{result.proposal.explanation.howToChange}</p></section></div>
          : phase === 'complete' ? <div className="nk-admin-ai-guide-result is-complete"><CheckCircle2/><small>{text.badge}</small><h2 id="admin-guide-title">{text.completeTitle}</h2><p className="nk-admin-guide-added-hint">{text.completeBody}</p></div>
          : phase === 'kept' ? <div className="nk-admin-ai-guide-result is-complete"><Save/><small>{text.added}</small><h2 id="admin-guide-title">{text.keptTitle}</h2><p className="nk-admin-guide-added-hint">{text.keptBody}</p></div>
          : <div className="nk-admin-ai-guide-error" role="alert"><X/><small>{text.error}</small><h2 id="admin-guide-title">{failure}</h2><p>{language === 'el' ? 'Δεν εφαρμόστηκε καμία επιπλέον αλλαγή.' : 'No additional change was applied.'}</p></div>}
      </main>
      <footer>
        {phase === 'intro' && <button type="button" onClick={start}><Sparkles/>{text.start}</button>}
        {phase === 'ready' && <button type="button" onClick={() => void analyse()}><ArrowRight/>{text.analyse}</button>}
        {phase === 'proposal' && result && <div className="nk-admin-guide-step-actions"><button type="button" onClick={() => void analyse()}><RefreshCw/>{text.reanalyse}</button><button type="button" onClick={() => void apply()}><ArrowRight/>{actionLabel(result, language)}</button></div>}
        {phase === 'explained' && <div className="nk-admin-guide-step-actions"><button type="button" onClick={() => setPhase('complete')}><CheckCircle2/>{text.finish}</button><button type="button" onClick={() => void analyse()}><Sparkles/>{text.next}</button></div>}
        {phase === 'complete' && <div className="nk-admin-guide-step-actions is-finish"><button className="danger" type="button" onClick={() => void restart()}><Trash2/>{text.restart}</button><button type="button" onClick={() => void keep()}><Save/>{text.keep}</button></div>}
        {phase === 'kept' && <button type="button" onClick={closeGuide}><CheckCircle2/>{text.done}</button>}
        {phase === 'error' && <button type="button" onClick={() => session ? void analyse() : start()}><RefreshCw/>{text.retry}</button>}
        {loading && <button type="button" disabled><LoaderCircle className="nk-admin-spin"/>{phase === 'starting' ? text.starting : phase === 'finishing' ? text.finishing : phase === 'applying' ? text.applying : text.analysing}</button>}
      </footer>
    </section>
  </div>;
}

function GuideLoading({title, body}: {title: string; body: string}) {
  return <div className="nk-admin-ai-guide-loading"><LoaderCircle className="nk-admin-spin"/><h2 id="admin-guide-title">{title}</h2><p>{body}</p><div><i/><i/><i/></div></div>;
}
