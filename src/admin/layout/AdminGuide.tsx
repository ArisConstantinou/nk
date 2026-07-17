import {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import {Bot, CheckCircle2, ExternalLink, Eye, Languages, LayoutTemplate, LoaderCircle, Palette, RefreshCw, Rocket, Save, ShieldCheck, Sparkles, Target, Trash2, Users, X} from 'lucide-react';
import {useLocation} from 'react-router-dom';
import {errorMessage} from '../api';
import {applyCmsGuideStep, finishCmsGuide, requestCmsGuideStart, requestCmsGuideStep, type CmsGuideBrief, type CmsGuideFeature, type CmsGuideFinishMode, type CmsGuideFinishResult, type CmsGuideLanguage, type CmsGuideSession, type CmsGuideStepResult} from '../guide/aiGuide';

const fallbackBrief: CmsGuideBrief = {title: 'Νέα σελίδα NK Electrical', pageType: 'landing', goal: 'leads', audience: 'mixed', tone: 'professional', requestedFeatures: ['hero', 'services', 'benefits', 'cta'], notes: '', autoApply: true};
type Phase = 'intro' | 'starting' | 'ready' | 'analysing' | 'proposal' | 'applying' | 'learning' | 'complete' | 'finishing' | 'kept' | 'published' | 'deleted' | 'error';

const local = (language: CmsGuideLanguage, el: string, en: string) => language === 'el' ? el : en;
const initialBrief = () => {
  try {
    const saved = JSON.parse(localStorage.getItem('nk-admin-guide-brief') || '') as Partial<CmsGuideBrief>;
    return {...fallbackBrief, ...saved, requestedFeatures: Array.isArray(saved.requestedFeatures) && saved.requestedFeatures.length ? saved.requestedFeatures : fallbackBrief.requestedFeatures};
  } catch { return fallbackBrief; }
};
const liveRoute = (route: string) => `${import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '')}${route}`;

function actionLabel(result: CmsGuideStepResult, language: CmsGuideLanguage) {
  if (result.proposal.action === 'insert_section') return local(language, `Νέο section: ${result.proposal.section.title}`, `New section: ${result.proposal.section.title}`);
  const el = {heading: 'τίτλος', text: 'κείμενο', image: 'εικόνα', gallery: 'gallery', button: 'κουμπί', icon: 'εικονίδιο', divider: 'διαχωριστικό'};
  return local(language, `Προσθήκη: ${el[result.proposal.component.type]}`, `Add: ${result.proposal.component.type}`);
}

export function AdminGuide({open, onClose, onNavigate}: {open: boolean; onClose: () => void; onNavigate: (to: string) => void}) {
  const location = useLocation();
  const [language, setLanguage] = useState<CmsGuideLanguage>(() => localStorage.getItem('nk-admin-guide-language') === 'en' ? 'en' : 'el');
  const [brief, setBrief] = useState<CmsGuideBrief>(initialBrief);
  const [phase, setPhase] = useState<Phase>('intro');
  const [step, setStep] = useState(0);
  const [session, setSession] = useState<CmsGuideSession | null>(null);
  const [result, setResult] = useState<CmsGuideStepResult | null>(null);
  const [lastApplied, setLastApplied] = useState<CmsGuideStepResult | null>(null);
  const [finished, setFinished] = useState<CmsGuideFinishResult | null>(null);
  const [failure, setFailure] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const pendingStart = useRef(false);
  const inEditor = location.pathname === '/admin/pages';
  const autoApply = session?.brief.autoApply ?? brief.autoApply;

  const reset = useCallback(() => {setPhase('intro'); setStep(0); setSession(null); setResult(null); setLastApplied(null); setFinished(null); setFailure('');}, []);
  const close = useCallback(() => {if (['kept', 'published', 'deleted'].includes(phase)) reset(); onClose();}, [onClose, phase, reset]);
  useEffect(() => {localStorage.setItem('nk-admin-guide-language', language);}, [language]);
  useEffect(() => {localStorage.setItem('nk-admin-guide-brief', JSON.stringify(brief));}, [brief]);
  useEffect(() => {if (open) window.setTimeout(() => closeRef.current?.focus(), 0);}, [open]);
  useEffect(() => {
    if (!open) return;
    const keydown = (event: KeyboardEvent) => {if (event.key === 'Escape' && panelRef.current?.contains(document.activeElement)) close();};
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [close, open]);
  useEffect(() => {if (open && ['proposal', 'learning', 'complete'].includes(phase)) panelRef.current?.querySelector('main')?.scrollTo({top: 0, behavior: 'smooth'});}, [open, phase, step]);
  useEffect(() => {
    if (!open || !inEditor || !window.matchMedia('(max-width: 520px)').matches || !['ready', 'analysing', 'proposal', 'applying', 'learning', 'complete'].includes(phase)) return;
    const reveal = () => {const stage = document.querySelector<HTMLElement>('.nk-visual-stage'); if (stage) window.scrollTo({top: Math.max(0, stage.getBoundingClientRect().top + window.scrollY - 8), behavior: 'auto'});};
    const first = window.setTimeout(reveal, 80); const settled = window.setTimeout(reveal, 420);
    return () => {window.clearTimeout(first); window.clearTimeout(settled);};
  }, [inEditor, open, phase, step]);

  const startInEditor = useCallback(async () => {
    setPhase('starting'); setFailure(''); setResult(null); setLastApplied(null); setFinished(null); setStep(0);
    try {
      const normalized = {...brief, autoApply: true, title: brief.title.trim() || fallbackBrief.title, requestedFeatures: [...new Set<CmsGuideFeature>(['hero', ...brief.requestedFeatures])]};
      const started = await requestCmsGuideStart(language, normalized);
      setBrief(normalized); setSession(started.session); setPhase('ready');
    } catch (error) {setFailure(errorMessage(error)); setPhase('error');}
  }, [brief, language]);
  useEffect(() => {
    if (!open || !inEditor || !pendingStart.current) return;
    pendingStart.current = false;
    const timer = window.setTimeout(() => void startInEditor(), 0);
    return () => window.clearTimeout(timer);
  }, [inEditor, open, startInEditor]);
  const start = () => {if (inEditor) void startInEditor(); else {pendingStart.current = true; onNavigate('/admin/pages');}};

  const analyse = useCallback(async () => {
    setPhase('analysing'); setFailure('');
    try {
      const next = await requestCmsGuideStep(language);
      setResult(next); setPhase(next.proposal.action === 'complete' ? 'complete' : 'proposal');
    } catch (error) {setFailure(errorMessage(error)); setPhase('error');}
  }, [language]);
  useEffect(() => {
    if (!open || !inEditor || phase !== 'ready' || !session) return;
    const timer = window.setTimeout(() => void analyse(), 180);
    return () => window.clearTimeout(timer);
  }, [analyse, inEditor, open, phase, session]);

  const apply = useCallback(async () => {
    if (!result || phase !== 'proposal') return;
    setPhase('applying'); setFailure('');
    try {
      const applied = await applyCmsGuideStep(result.proposal, result.context);
      setLastApplied(applied); setStep(value => value + 1); setPhase('learning');
    } catch (error) {setFailure(errorMessage(error)); setPhase('error');}
  }, [phase, result]);
  useEffect(() => {
    if (!open || phase !== 'proposal' || !result || !autoApply) return;
    const timer = window.setTimeout(() => void apply(), 1400);
    return () => window.clearTimeout(timer);
  }, [apply, autoApply, open, phase, result]);

  const finish = async (mode: CmsGuideFinishMode) => {
    setPhase('finishing'); setFailure('');
    try {
      const outcome = await finishCmsGuide(mode);
      setFinished(outcome); setSession(null); setPhase(mode === 'publish' ? 'published' : mode === 'keep' ? 'kept' : 'deleted');
    } catch (error) {setFailure(errorMessage(error)); setPhase('error');}
  };

  if (!open) return null;
  const busy = ['starting', 'analysing', 'applying', 'finishing'].includes(phase);
  return <div className="nk-admin-guide-overlay nk-admin-ai-guide-overlay" role="presentation">
    <div className="nk-admin-ai-guide-preview-label" aria-hidden="true"><Eye/>{local(language, 'LIVE PREVIEW ΠΑΝΩ', 'LIVE PREVIEW ABOVE')}</div>
    <section id="admin-ai-page-guide" ref={panelRef} className="nk-admin-guide nk-admin-ai-guide nk-admin-ai-guide--next" role="dialog" aria-modal="false" aria-labelledby="admin-guide-title">
      <header><div><Bot/><span>{local(language, 'AI ΟΔΗΓΟΣ ΣΕΛΙΔΑΣ', 'AI PAGE GUIDE')}</span></div><button ref={closeRef} type="button" onClick={close} aria-label={local(language, 'Κλείσιμο AI οδηγού', 'Close AI guide')}><X/></button></header>
      <div className="nk-admin-guide-language"><Languages/><button type="button" className={language === 'el' ? 'active' : ''} onClick={() => setLanguage('el')}>Ελληνικά</button><button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>English</button></div>
      <div className="nk-admin-ai-guide-step"><Sparkles/><span>{local(language, 'ΧΤΙΖΟΥΜΕ ΜΑΖΙ', 'BUILDING TOGETHER')}{session ? ` · ${String(step + 1).padStart(2, '0')}` : ''}</span><b>{local(language, 'Αποθηκεύεται ως πρόχειρο · τίποτα δεν δημοσιεύεται μόνο του', 'Saved as a draft · nothing is published automatically')}</b></div>
      <main aria-live="polite">
        {phase === 'intro' ? <Intro brief={brief} language={language} onChange={setBrief}/>
          : phase === 'starting' ? <Loading title={local(language, 'Ετοιμάζω τον καμβά…', 'Preparing the canvas…')} body={local(language, 'Δημιουργείται ξεχωριστό draft. Καμία υπάρχουσα σελίδα δεν αλλάζει.', 'A separate draft is being created. No existing page is changed.')}/>
          : phase === 'ready' ? <State icon={<CheckCircle2/>} eyebrow={local(language, 'ΠΡΟΧΕΙΡΟ', 'DRAFT')} title={local(language, 'Η νέα σελίδα είναι έτοιμη για το πρώτο βήμα.', 'Your new page is ready for its first step.')} body={local(language, 'Θα δω τι χρειάζεται και θα ξεκινήσω από το πιο χρήσιμο σημείο.', 'I will look at what it needs and start with the most useful part.')}/>
          : phase === 'analysing' ? <Loading title={local(language, 'Σχεδιάζω το επόμενο χρήσιμο κομμάτι…', 'Planning the next useful part…')} body={local(language, 'Κοιτάζω όσα υπάρχουν ήδη, ώστε η σελίδα να παραμένει καθαρή και ομοιόμορφη.', 'I am checking what is already there so the page stays clear and consistent.')}/>
          : phase === 'applying' ? <Loading title={local(language, 'Το προσθέτω στη σελίδα σου…', 'Adding it to your page…')} body={local(language, 'Σε λίγο θα το δεις στην προεπισκόπηση και θα σου εξηγήσω τι άλλαξε.', 'You will see it in the preview in a moment, and I will explain what changed.')}/>
          : phase === 'finishing' ? <Loading title={local(language, 'Εφαρμόζω την τελική επιλογή…', 'Applying the final choice…')} body={local(language, 'Η επιλογή αφορά μόνο τη σελίδα αυτής της συνεδρίας.', 'The choice affects only this session page.')}/>
          : phase === 'proposal' && result ? <Proposal result={result} language={language} autoApply={autoApply}/>
          : phase === 'learning' && lastApplied ? <Learning result={lastApplied} language={language}/>
          : phase === 'complete' && result ? <><State icon={<CheckCircle2/>} eyebrow="AI READY" title={local(language, 'Η σελίδα είναι έτοιμη για την απόφασή σου.', 'The page is ready for your decision.')} body={local(language, 'Η νέα ανάλυση κάλυψε τα ζητούμενα. Τίποτα δεν δημοσιεύεται χωρίς τη ρητή επιλογή σου.', 'The fresh analysis covered the request. Nothing is published without your explicit choice.')}/><ContextJson result={result} language={language}/></>
          : phase === 'kept' ? <State icon={<Save/>} eyebrow="DRAFT" title={local(language, 'Η σελίδα κρατήθηκε ως draft.', 'The page was kept as a draft.')} body={local(language, 'Παραμένει στον Website Editor με drag-and-drop, Properties, βελάκια και Undo.', 'It remains in the Website Editor with drag-and-drop, Properties, arrow keys and Undo.')}/>
          : phase === 'published' ? <><State icon={<Rocket/>} eyebrow="LIVE" title={local(language, 'Η σελίδα δημοσιεύτηκε.', 'The page is published.')} body={local(language, 'Το draft έγινε live έκδοση και παραμένει πλήρως επεξεργάσιμο.', 'The draft became the live version and remains fully editable.')}/>{finished && <a className="nk-admin-guide-live-link" href={liveRoute(finished.route)} target="_blank" rel="noreferrer">{local(language, 'Άνοιξε τη live σελίδα', 'Open the live page')}<ExternalLink/></a>}</>
          : phase === 'deleted' ? <State icon={<Trash2/>} eyebrow="DELETED" title={local(language, 'Η draft σελίδα διαγράφηκε.', 'The draft page was deleted.')} body={local(language, 'Καμία άλλη σελίδα ή media δεν επηρεάστηκε.', 'No other page or media was affected.')}/>
          : <div className="nk-admin-ai-guide-error" role="alert"><X/><small>{local(language, 'ΤΟ ΒΗΜΑ ΔΕΝ ΟΛΟΚΛΗΡΩΘΗΚΕ', 'STEP NOT COMPLETED')}</small><h2 id="admin-guide-title">{failure}</h2><p>{local(language, 'Δεν εφαρμόστηκε καταστροφική αλλαγή. Μπορείς να αναλύσεις ξανά.', 'No destructive change was applied. You can analyse again.')}</p></div>}
      </main>
      <footer>
        {phase === 'intro' && <button type="button" onClick={start} disabled={!brief.title.trim()}><Sparkles/>{local(language, 'Ξεκίνα τη σελίδα μου', 'Start my page')}</button>}
        {phase === 'proposal' && result && (autoApply ? <button type="button" disabled><LoaderCircle className="nk-admin-spin"/>{local(language, 'Αυτόματη εφαρμογή…', 'Applying automatically…')}</button> : <div className="nk-admin-guide-step-actions"><button className="secondary" type="button" onClick={() => void analyse()}><RefreshCw/>{local(language, 'Ανάλυσε τη δική μου αλλαγή', 'Analyse my change')}</button><button type="button" onClick={() => void apply()}><Sparkles/>{actionLabel(result, language)}</button></div>)}
        {phase === 'learning' && <div className="nk-admin-guide-step-actions"><button className="danger" type="button" onClick={() => void finish('discard')}><Trash2/>{local(language, 'Σταμάτα & διέγραψε', 'Stop & delete')}</button><button type="button" onClick={() => void analyse()}><Sparkles/>{local(language, 'Συνέχισε', 'Continue')}</button></div>}
        {phase === 'complete' && <div className="nk-admin-guide-final-actions"><button className="danger" type="button" onClick={() => void finish('discard')}><Trash2/>{local(language, 'Διαγραφή', 'Delete')}</button><button className="secondary" type="button" onClick={() => void finish('keep')}><Save/>{local(language, 'Αποθήκευση για αργότερα', 'Save for later')}</button><button type="button" onClick={() => void finish('publish')}><Rocket/>{local(language, 'Δημοσίευση', 'Publish')}</button></div>}
        {['kept', 'published'].includes(phase) && <button type="button" onClick={close}><CheckCircle2/>{local(language, 'Τέλος', 'Done')}</button>}
        {phase === 'deleted' && <button type="button" onClick={reset}><Sparkles/>{local(language, 'Δημιούργησε άλλη σελίδα', 'Create another page')}</button>}
        {phase === 'error' && <button type="button" onClick={() => session ? void analyse() : start()}><RefreshCw/>{local(language, 'Δοκιμή ξανά', 'Try again')}</button>}
        {busy && <button type="button" disabled><LoaderCircle className="nk-admin-spin"/>{local(language, 'Εργασία σε εξέλιξη…', 'Working…')}</button>}
      </footer>
    </section>
  </div>;
}

function Intro({brief, language, onChange}: {brief: CmsGuideBrief; language: CmsGuideLanguage; onChange: (brief: CmsGuideBrief) => void}) {
  return <div className="nk-admin-ai-guide-intro nk-admin-guide-brief"><Bot/><small>{local(language, 'ΑΣ ΞΕΚΙΝΗΣΟΥΜΕ', "LET'S START")}</small><h2 id="admin-guide-title">{local(language, 'Τι θέλεις να πετύχει αυτή η σελίδα;', 'What should this page do for you?')}</h2><p>{local(language, 'Απάντησε σε δύο απλές ερωτήσεις. Εγώ θα επιλέξω τη σωστή δομή και θα σου εξηγώ κάθε αλλαγή καθώς τη βλέπεις.', 'Answer two simple questions. I will choose the right structure and explain every change as you see it happen.')}</p><BriefForm brief={brief} language={language} onChange={onChange}/><div className="nk-admin-ai-safety"><ShieldCheck/><span><b>{local(language, 'Εσύ έχεις πάντα τον έλεγχο', 'You are always in control')}</b><small>{local(language, 'Η σελίδα μένει πρόχειρη μέχρι να πατήσεις εσύ «Δημοσίευση».', 'The page stays private until you choose Publish.')}</small></span></div></div>;
}

function BriefForm({brief, language, onChange}: {brief: CmsGuideBrief; language: CmsGuideLanguage; onChange: (brief: CmsGuideBrief) => void}) {
  const features: Array<[CmsGuideFeature, string]> = [['hero', local(language, 'Δυνατό ξεκίνημα', 'Strong opening')], ['services', local(language, 'Υπηρεσίες', 'Services')], ['benefits', local(language, 'Γιατί να μας επιλέξουν', 'Why choose us')], ['process', local(language, 'Πώς λειτουργεί', 'How it works')], ['gallery', local(language, 'Φωτογραφίες', 'Photos')], ['cta', local(language, 'Κουμπί επικοινωνίας', 'Contact button')]];
  const goals: Array<{id: CmsGuideBrief['goal']; title: string; description: string}> = [
    {id: 'leads', title: local(language, 'Θέλω περισσότερα τηλεφωνήματα ή μηνύματα', 'I want more calls or messages'), description: local(language, 'Προτεινόμενο για τις περισσότερες νέες σελίδες.', 'Recommended for most new pages.')},
    {id: 'explain', title: local(language, 'Θέλω να εξηγήσω μια υπηρεσία', 'I want to explain a service'), description: local(language, 'Δείχνει καθαρά τι προσφέρεις και πώς βοηθάς.', 'Clearly shows what you offer and how it helps.')},
    {id: 'showcase', title: local(language, 'Θέλω να δείξω τη δουλειά μου', 'I want to show my work'), description: local(language, 'Δίνει έμφαση σε έργα και φωτογραφίες.', 'Focuses on projects and photos.')},
    {id: 'trust', title: local(language, 'Θέλω να γνωρίσουν την επιχείρησή μου', 'I want people to know my business'), description: local(language, 'Παρουσιάζει την εμπειρία και τους ανθρώπους σου.', 'Introduces your experience and your team.')},
  ];
  const presets: Record<CmsGuideBrief['goal'], Pick<CmsGuideBrief, 'pageType' | 'requestedFeatures'>> = {
    leads: {pageType: 'landing', requestedFeatures: ['hero', 'services', 'benefits', 'cta']},
    explain: {pageType: 'service', requestedFeatures: ['hero', 'services', 'benefits', 'process', 'cta']},
    showcase: {pageType: 'portfolio', requestedFeatures: ['hero', 'gallery', 'benefits', 'cta']},
    trust: {pageType: 'company', requestedFeatures: ['hero', 'benefits', 'gallery', 'cta']},
  };
  const chooseGoal = (goal: CmsGuideBrief['goal']) => onChange({...brief, goal, ...presets[goal], autoApply: true});
  const toggle = (feature: CmsGuideFeature) => {if (feature !== 'hero') onChange({...brief, requestedFeatures: brief.requestedFeatures.includes(feature) ? brief.requestedFeatures.filter(item => item !== feature) : [...brief.requestedFeatures, feature]});};
  return <div className="nk-admin-guide-brief-form">
    <label className="is-wide nk-admin-guide-topic"><span><b>1</b>{local(language, 'Για ποιο θέμα είναι η σελίδα;', 'What is the page about?')}</span><input value={brief.title} maxLength={240} placeholder={local(language, 'π.χ. Φωτισμός και ηλεκτρολογικές εγκαταστάσεις', 'e.g. Lighting and electrical installations')} onChange={event => onChange({...brief, title: event.target.value})}/></label>
    <section className="nk-admin-guide-goal is-wide" aria-labelledby="nk-guide-goal-title"><div className="nk-admin-guide-question"><b>2</b><span><strong id="nk-guide-goal-title">{local(language, 'Τι θέλεις να κάνει για σένα;', 'What should it help you do?')}</strong><small>{local(language, 'Δεν υπάρχει λάθος απάντηση. Η πρώτη επιλογή είναι μια ασφαλής πρόταση.', 'There is no wrong answer. The first option is a safe recommendation.')}</small></span></div><div className="nk-admin-guide-goal-options">{goals.map(goal => <button key={goal.id} type="button" className={brief.goal === goal.id ? 'active' : ''} aria-pressed={brief.goal === goal.id} onClick={() => chooseGoal(goal.id)}><span>{brief.goal === goal.id ? <CheckCircle2/> : null}<b>{goal.title}</b></span><small>{goal.description}</small></button>)}</div></section>
    <details className="nk-admin-guide-advanced is-wide"><summary><span>{local(language, 'Θέλω περισσότερες επιλογές', 'I want more options')}</span><small>{local(language, 'Προαιρετικό', 'Optional')}</small></summary><div>
      <Select icon={<Users/>} label={local(language, 'Ποιοι θα διαβάσουν κυρίως τη σελίδα;', 'Who will mainly read this page?')} value={brief.audience} onChange={value => onChange({...brief, audience: value as CmsGuideBrief['audience']})} options={[['mixed', local(language, 'Όλοι', 'Everyone')], ['residential', local(language, 'Ιδιοκτήτες κατοικιών', 'Home owners')], ['commercial', local(language, 'Επιχειρήσεις', 'Businesses')]]}/>
      <Select icon={<Palette/>} label={local(language, 'Πώς θέλεις να ακούγεται;', 'How should it sound?')} value={brief.tone} onChange={value => onChange({...brief, tone: value as CmsGuideBrief['tone']})} options={[['professional', local(language, 'Καθαρό και αξιόπιστο', 'Clear and trustworthy')], ['warm', local(language, 'Φιλικό', 'Friendly')], ['bold', local(language, 'Δυναμικό', 'Confident')], ['technical', local(language, 'Με περισσότερες λεπτομέρειες', 'More detailed')]]}/>
      <fieldset><legend>{local(language, 'Θέλεις οπωσδήποτε κάτι από αυτά;', 'Is there anything you definitely want?')}</legend><div>{features.map(([id, label]) => <button key={id} type="button" className={brief.requestedFeatures.includes(id) || id === 'hero' ? 'active' : ''} onClick={() => toggle(id)} disabled={id === 'hero'}>{brief.requestedFeatures.includes(id) || id === 'hero' ? <CheckCircle2/> : <span/>}{label}</button>)}</div></fieldset>
      <label className="is-wide"><span>{local(language, 'Κάτι άλλο που πρέπει να γνωρίζω;', 'Anything else I should know?')}</span><textarea rows={3} maxLength={1200} placeholder={local(language, 'Προαιρετικά, γράψε το με δικά σου λόγια…', 'Optional — use your own words…')} value={brief.notes} onChange={event => onChange({...brief, notes: event.target.value})}/></label>
    </div></details>
  </div>;
}

function Select({icon, label, value, onChange, options}: {icon: ReactNode; label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>}) {
  return <label><span>{icon}{label}</span><select value={value} onChange={event => onChange(event.target.value)}>{options.map(([id, text]) => <option value={id} key={id}>{text}</option>)}</select></label>;
}

function Proposal({result, language, autoApply}: {result: CmsGuideStepResult; language: CmsGuideLanguage; autoApply: boolean}) {
  return <div className="nk-admin-ai-guide-result is-proposal"><Sparkles/><small>{local(language, 'ΒΕΛΤΙΣΤΗ ΕΠΟΜΕΝΗ ΕΝΕΡΓΕΙΑ', 'BEST NEXT ACTION')}</small><h2 id="admin-guide-title">{result.proposal.explanation.summary}</h2><div className="nk-admin-guide-action-card"><span>{actionLabel(result, language)}</span><b>{autoApply ? local(language, 'Εφαρμόζεται αυτόματα σε λίγο', 'Applies automatically in a moment') : local(language, 'Έτοιμο για εφαρμογή', 'Ready to apply')}</b></div><Explain result={result} language={language}/><ContextJson result={result} language={language}/></div>;
}
function Learning({result, language}: {result: CmsGuideStepResult; language: CmsGuideLanguage}) {
  return <div className="nk-admin-ai-guide-result is-learning"><CheckCircle2/><small>{local(language, 'ΤΟ ΒΗΜΑ ΕΦΑΡΜΟΣΤΗΚΕ', 'THE STEP WAS APPLIED')}</small><h2 id="admin-guide-title">{result.proposal.explanation.summary}</h2><div className="nk-admin-ai-live-receipt"><CheckCircle2/><span><small>LIVE PREVIEW</small><b>{actionLabel(result, language)}</b></span></div><Explain result={result} language={language}/>{result.proposal.designNotes.length > 0 && <ul>{result.proposal.designNotes.map(note => <li key={note}>{note}</li>)}</ul>}<p className="nk-admin-guide-practice">{local(language, 'Δοκίμασέ το τώρα στο preview. Η επόμενη ανάλυση θα διαβάσει ξανά τη νέα κατάσταση.', 'Try it now in the preview. The next analysis will read the new state again.')}</p></div>;
}
function Explain({result, language}: {result: CmsGuideStepResult; language: CmsGuideLanguage}) {
  return <><section><b>{local(language, 'Γιατί μπαίνει εδώ', 'Why it belongs here')}</b><p>{result.proposal.explanation.reason}</p></section><section><b>{local(language, 'Μάθε κάνοντας', 'Learn by doing')}</b><p>{result.proposal.explanation.howToChange}</p></section></>;
}
function ContextJson({result, language}: {result: CmsGuideStepResult; language: CmsGuideLanguage}) {
  return <details><summary><RefreshCw/>{local(language, 'JSON που αναλύθηκε για αυτό το βήμα', 'JSON analysed for this step')}</summary><pre>{JSON.stringify(result.context, null, 2)}</pre></details>;
}
function Loading({title, body}: {title: string; body: string}) {
  return <div className="nk-admin-ai-guide-loading"><LoaderCircle className="nk-admin-spin"/><h2 id="admin-guide-title">{title}</h2><p>{body}</p><div><i/><i/><i/></div></div>;
}
function State({icon, eyebrow, title, body}: {icon: ReactNode; eyebrow: string; title: string; body: string}) {
  return <div className="nk-admin-ai-guide-result is-complete">{icon}<small>{eyebrow}</small><h2 id="admin-guide-title">{title}</h2><p className="nk-admin-guide-added-hint">{body}</p></div>;
}
