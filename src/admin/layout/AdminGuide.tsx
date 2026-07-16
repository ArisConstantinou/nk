import {useEffect, useRef, useState} from 'react';
import {Bot, CheckCircle2, ChevronRight, Code2, Languages, LoaderCircle, Map, RefreshCw, ShieldCheck, Sparkles, X} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {errorMessage} from '../api';
import {requestCmsGuideStep, type CmsGuideLanguage, type CmsGuideStepResult} from '../guide/aiGuide';

const words = {
  en: {
    title: 'AI CMS GUIDE', close: 'Close AI guide', introTitle: 'A guide that reads the page first.',
    intro: 'Before every step, the guide sends a fresh JSON snapshot of the current page structure to the AI. It validates one safe action, applies it to the draft, then explains the result.',
    openEditor: 'Open Website Editor', analyse: 'Analyse & apply next step', again: 'Analyse next step', analysing: 'Analysing the current page…',
    applying: 'Validating and applying one safe action…', safe: 'Draft only · additive actions · Undo available', result: 'WHAT CHANGED',
    why: 'Why here', change: 'How to change it', complete: 'The page is already in a good state.', error: 'The step was not applied', retry: 'Try again',
    input: 'Page JSON sent to AI', output: 'Validated JSON returned by AI', step: 'AI STEP', editorRequired: 'The adaptive builder runs inside the Website Editor so it can use the same internal functions as drag and drop.',
  },
  el: {
    title: 'AI ΟΔΗΓΟΣ CMS', close: 'Κλείσιμο AI οδηγού', introTitle: 'Ένας οδηγός που διαβάζει πρώτα τη σελίδα.',
    intro: 'Πριν από κάθε βήμα, ο οδηγός στέλνει στο AI ένα νέο JSON snapshot της τρέχουσας δομής. Ελέγχει μία ασφαλή ενέργεια, την εφαρμόζει στο draft και μετά εξηγεί το αποτέλεσμα.',
    openEditor: 'Άνοιγμα Website Editor', analyse: 'Ανάλυση & εφαρμογή επόμενου βήματος', again: 'Ανάλυση επόμενου βήματος', analysing: 'Ανάλυση της τρέχουσας σελίδας…',
    applying: 'Έλεγχος και εφαρμογή μίας ασφαλούς ενέργειας…', safe: 'Μόνο draft · προσθετικές ενέργειες · διαθέσιμο Undo', result: 'ΤΙ ΠΡΟΣΤΕΘΗΚΕ',
    why: 'Γιατί μπήκε εδώ', change: 'Πώς αλλάζει', complete: 'Η σελίδα βρίσκεται ήδη σε καλή κατάσταση.', error: 'Το βήμα δεν εφαρμόστηκε', retry: 'Δοκιμή ξανά',
    input: 'JSON σελίδας που στάλθηκε στο AI', output: 'Ελεγμένο JSON που επέστρεψε το AI', step: 'AI ΒΗΜΑ', editorRequired: 'Ο προσαρμοστικός οδηγός λειτουργεί μέσα στο Website Editor ώστε να χρησιμοποιεί τις ίδιες εσωτερικές λειτουργίες με το drag and drop.',
  },
};

type Phase = 'idle' | 'analysing' | 'explained' | 'error';

export function AdminGuide({open, onClose, onNavigate}: {open: boolean; onClose: () => void; onNavigate: (to: string) => void}) {
  const location = useLocation();
  const [language, setLanguage] = useState<CmsGuideLanguage>(() => localStorage.getItem('nk-admin-guide-language') === 'el' ? 'el' : 'en');
  const [phase, setPhase] = useState<Phase>('idle');
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<CmsGuideStepResult | null>(null);
  const [failure, setFailure] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const text = words[language];
  const inEditor = location.pathname === '/admin/pages';

  useEffect(() => {localStorage.setItem('nk-admin-guide-language', language);}, [language]);
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    window.setTimeout(() => closeRef.current?.focus(), 0);
    return () => previousFocusRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key !== 'Tab') return;
      const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], summary, [tabindex]:not([tabindex="-1"])') || [])].filter(control => control.getClientRects().length > 0);
      if (!controls.length) return;
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
      else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, [onClose, open]);
  useEffect(() => {if (!inEditor) {setPhase('idle'); setResult(null); setFailure('');}}, [inEditor]);

  const runStep = async () => {
    setPhase('analysing'); setFailure('');
    try {
      const next = await requestCmsGuideStep(language);
      setResult(next); setPhase('explained');
      setStep(current => current + 1);
    } catch (error) {setFailure(errorMessage(error)); setPhase('error');}
  };
  if (!open) return null;

  return <div className="nk-admin-guide-overlay nk-admin-ai-guide-overlay" role="presentation">
    <section ref={dialogRef} className="nk-admin-guide nk-admin-ai-guide" role="dialog" aria-modal="true" aria-labelledby="admin-guide-title">
      <header><div><Bot/><span>{text.title}</span></div><button ref={closeRef} type="button" onClick={onClose} aria-label={text.close}><X/></button></header>
      <div className="nk-admin-guide-language" aria-label="Guide language"><Languages/><button type="button" className={language === 'en' ? 'active' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button><button type="button" className={language === 'el' ? 'active' : ''} aria-pressed={language === 'el'} onClick={() => setLanguage('el')}>Ελληνικά</button></div>
      <div className="nk-admin-ai-guide-step"><Sparkles/><span>{text.step} {phase === 'explained' ? Math.max(1, step) : step + 1}</span><b>{text.safe}</b></div>
      <main>
        {!inEditor ? <div className="nk-admin-ai-guide-intro"><Map/><small>ADAPTIVE WORKFLOW</small><h2 id="admin-guide-title">{text.introTitle}</h2><p>{text.editorRequired}</p><button type="button" onClick={() => onNavigate('/admin/pages')}>{text.openEditor}<ChevronRight/></button></div> : <>
          {phase === 'idle' && <div className="nk-admin-ai-guide-intro"><Bot/><small>FRESH ANALYSIS BEFORE EVERY STEP</small><h2 id="admin-guide-title">{text.introTitle}</h2><p>{text.intro}</p><div className="nk-admin-ai-safety"><ShieldCheck/><span><b>{text.safe}</b><small>The AI cannot call delete, replace, move or publish operations.</small></span></div></div>}
          {phase === 'analysing' && <div className="nk-admin-ai-guide-loading" aria-live="polite"><LoaderCircle className="nk-admin-spin"/><h2 id="admin-guide-title">{text.analysing}</h2><p>{text.applying}</p><div><i/><i/><i/></div></div>}
          {phase === 'error' && <div className="nk-admin-ai-guide-error" role="alert"><X/><small>{text.error}</small><h2 id="admin-guide-title">{failure}</h2><p>No draft content was changed.</p></div>}
          {phase === 'explained' && result && <div className="nk-admin-ai-guide-result"><CheckCircle2/><small>{result.proposal.action === 'complete' ? 'ANALYSIS COMPLETE' : text.result}</small><h2 id="admin-guide-title">{result.proposal.action === 'complete' ? text.complete : result.proposal.explanation.summary}</h2><section><b>{text.why}</b><p>{result.proposal.explanation.reason}</p></section><section><b>{text.change}</b><p>{result.proposal.explanation.howToChange}</p></section>{result.proposal.designNotes.length > 0 && <ul>{result.proposal.designNotes.map(note => <li key={note}>{note}</li>)}</ul>}<div className="nk-admin-ai-safety"><ShieldCheck/><span><b>{result.applied ? 'Saved to draft only' : 'No change needed'}</b><small>{result.applied ? 'Use Undo in the editor to remove this exact step.' : 'Nothing was modified.'}</small></span></div><details><summary><Code2/>{text.input}</summary><pre>{JSON.stringify(result.context, null, 2)}</pre></details><details><summary><Code2/>{text.output}</summary><pre>{JSON.stringify(result.proposal, null, 2)}</pre></details></div>}
        </>}
      </main>
      {inEditor && <footer><button type="button" onClick={() => void runStep()} disabled={phase === 'analysing'}>{phase === 'analysing' ? <LoaderCircle className="nk-admin-spin"/> : phase === 'explained' ? <RefreshCw/> : <Sparkles/>}{phase === 'explained' ? text.again : phase === 'error' ? text.retry : text.analyse}</button></footer>}
    </section>
  </div>;
}
