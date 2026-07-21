import {useEffect, useMemo, useState, type FormEvent} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileCheck2,
  FileImage,
  Home,
  Lightbulb,
  LoaderCircle,
  Mail,
  MapPin,
  Network,
  PackageSearch,
  Phone,
  Ruler,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import {useContent, type PublicFormField} from '../context/ContentContext';
import {publicAsset} from '../utils/assets';
import {QuoteScopePlayer} from './QuoteScopePlayer';
import {NicosiaAddressAutocomplete} from './NicosiaAddressAutocomplete';

const QUOTE_DRAFT_KEY = 'nk-electrical-quote-draft-v1';
const QUOTE_ASSET = publicAsset('assets/generated/quote-scope-workbench-v1.webp');

const routeIcons: Array<{match: RegExp; Icon: LucideIcon; code: string; note: string}> = [
  {match: /electrical installation/i, Icon: Zap, code: 'POWER / BUILD', note: 'Power, circuits, distribution and final installation.'},
  {match: /lighting/i, Icon: Lightbulb, code: 'LIGHT / SHAPE', note: 'Lighting intent, specification and installation coordination.'},
  {match: /smart home|automation/i, Icon: SlidersHorizontal, code: 'CONTROL / SCENE', note: 'Connected controls planned around the way the property is used.'},
  {match: /security|low voltage/i, Icon: ShieldCheck, code: 'PROTECT / CONNECT', note: 'Security and low-voltage systems coordinated as one scope.'},
  {match: /maintenance|fault/i, Icon: Wrench, code: 'TRACE / RESTORE', note: 'Existing-system symptoms, access and urgency routed clearly.'},
  {match: /product/i, Icon: PackageSearch, code: 'SELECT / SUPPLY', note: 'Product, quantity and installation context kept together.'},
];

const propertyIcons: Array<{match: RegExp; Icon: LucideIcon}> = [
  {match: /private residence/i, Icon: Home},
  {match: /apartment/i, Icon: Building2},
  {match: /office|public|shared/i, Icon: Building2},
  {match: /retail/i, Icon: Store},
  {match: /hospitality/i, Icon: Lightbulb},
];

const valueIsEmpty = (value: string | boolean | undefined) => typeof value === 'boolean' ? !value : !String(value || '').trim();

const stepForField = (field: PublicFormField) => {
  if (['work-type', 'property-type'].includes(field.name)) return 1;
  if (['location', 'project-location', 'timeframe'].includes(field.name)) return 2;
  if (['name', 'phone', 'email'].includes(field.name)) return 3;
  return 4;
};

function FieldShell({field, value, busy, update}: {
  field: PublicFormField;
  value: string | boolean;
  busy: boolean;
  update: (field: PublicFormField, value: string | boolean) => void;
}) {
  if (field.type === 'checkbox') return <label className="quote-field quote-field--check">
    <input name={field.name} type="checkbox" checked={Boolean(value)} required={field.required} disabled={busy} onChange={event => update(field, event.target.checked)}/>
    <span><Check/>{field.placeholder || field.label}</span>
  </label>;

  return <label className={`quote-field${field.type === 'textarea' ? ' quote-field--wide quote-field--brief' : ''}`}>
    <span>{field.label}{field.required && <b>Required</b>}</span>
    {field.type === 'textarea'
      ? <textarea name={field.name} rows={8} required={field.required} maxLength={5000} disabled={busy} placeholder={field.placeholder} value={String(value)} onChange={event => update(field, event.target.value)}/>
      : field.type === 'select'
        ? <select name={field.name} required={field.required} disabled={busy} value={String(value)} onChange={event => update(field, event.target.value)}>
          {field.options.map(option => <option key={option}>{option}</option>)}
        </select>
        : <input
          name={field.name}
          type={field.type}
          required={field.required}
          maxLength={500}
          disabled={busy}
          placeholder={field.placeholder}
          value={String(value)}
          autoComplete={field.name === 'name' ? 'name' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : undefined}
          onChange={event => update(field, event.target.value)}
        />}
  </label>;
}

export function QuoteScopeComposer({defaultWorkType, preferDefault = false}: {defaultWorkType: string; preferDefault?: boolean}) {
  const {formBySlug, submitForm} = useContent();
  const form = formBySlug('quote');
  const activeFields = useMemo(() => form?.fields.filter(field => field.active) || [], [form]);
  const formConfigKey = activeFields.map(item => `${item.id}:${item.name}:${item.type}:${item.required}:${item.options.join(',')}`).join('|');
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const field = (name: string) => activeFields.find(item => item.name === name || (name === 'location' && item.name === 'project-location'));
  const workField = field('work-type');
  const propertyField = field('property-type');
  const locationField = field('location');
  const timeframeField = field('timeframe');
  const messageField = activeFields.find(item => item.type === 'textarea' || item.name === 'message');
  const fieldsByStep = (target: number) => activeFields.filter(item => stepForField(item) === target);

  useEffect(() => {
    if (!form) return;
    const initial: Record<string, string | boolean> = {};
    activeFields.forEach(item => {
      initial[item.name] = item.type === 'checkbox' ? false : item.type === 'select' ? item.options[0] || '' : '';
    });
    if (workField) initial[workField.name] = defaultWorkType;

    try {
      const stored = JSON.parse(window.localStorage.getItem(QUOTE_DRAFT_KEY) || 'null') as {values?: Record<string, string | boolean>; step?: number} | null;
      if (stored?.values) {
        activeFields.forEach(item => {
          if (stored.values?.[item.name] !== undefined) initial[item.name] = stored.values[item.name];
        });
      }
      if (preferDefault && workField) initial[workField.name] = defaultWorkType;
      setStep(Math.max(1, Math.min(4, Number(stored?.step || 1))));
    } catch {
      setStep(1);
    }

    setValues(initial);
    setHydrated(true);
  }, [defaultWorkType, form?.id, formConfigKey, preferDefault]);

  useEffect(() => {
    if (!hydrated || success) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(QUOTE_DRAFT_KEY, JSON.stringify({values, step, updatedAt: new Date().toISOString()}));
      } catch {}
    }, 420);
    return () => window.clearTimeout(timer);
  }, [hydrated, step, success, values]);

  const update = (item: PublicFormField, next: string | boolean) => {
    setValues(current => ({...current, [item.name]: next}));
    setError('');
  };

  const validate = (items: PublicFormField[]) => {
    const missing = items.find(item => item.required && valueIsEmpty(values[item.name]));
    if (!missing) return true;
    setError(`Please complete “${missing.label}” before continuing.`);
    return false;
  };

  const advance = () => {
    if (!validate(fieldsByStep(step))) return;
    setStep(current => Math.min(4, current + 1));
  };

  const resetDraft = () => {
    window.localStorage.removeItem(QUOTE_DRAFT_KEY);
    const initial: Record<string, string | boolean> = {};
    activeFields.forEach(item => {
      initial[item.name] = item.type === 'checkbox' ? false : item.type === 'select' ? item.options[0] || '' : '';
    });
    if (workField) initial[workField.name] = defaultWorkType;
    setValues(initial);
    setStep(1);
    setError('');
    setSuccess('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form || !validate(activeFields)) return;
    setBusy(true);
    setError('');
    try {
      const payload: Record<string, string | boolean> = {website: ''};
      activeFields.forEach(item => { payload[item.name] = values[item.name] ?? (item.type === 'checkbox' ? false : ''); });
      setSuccess(await submitForm('quote', payload));
      window.localStorage.removeItem(QUOTE_DRAFT_KEY);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The quote request could not be submitted.');
    } finally {
      setBusy(false);
    }
  };

  if (!form || !hydrated) return <section className="quote-scope-loading section" role="status">
    <Sparkles/><span>PROJECT SCOPE COMPOSER</span><h2>Preparing the quote builder.</h2><p>For urgent electrical faults, call <a href="tel:+35722494145">+357 22 494145</a>.</p>
  </section>;

  const workValue = String(workField ? values[workField.name] || workField.options[0] : 'Electrical installation');
  const propertyValue = String(propertyField ? values[propertyField.name] || propertyField.options[0] : 'Property not selected');
  const locationValue = String(locationField ? values[locationField.name] || '' : '');
  const timeframeValue = String(timeframeField ? values[timeframeField.name] || timeframeField.options[0] : '');
  const route = routeIcons.find(item => item.match.test(workValue)) || routeIcons[0];
  const required = activeFields.filter(item => item.required);
  const completed = required.filter(item => !valueIsEmpty(values[item.name])).length;
  const readiness = required.length ? Math.round(completed / required.length * 100) : 0;
  const RouteIcon = route.Icon;

  const selectOptions = (item: PublicFormField | undefined, kind: 'work' | 'property' | 'timeframe') => {
    if (!item) return null;
    return <div className={`quote-choice-grid quote-choice-grid--${kind}`} role="group" aria-label={item.label}>
      {item.options.map((option, index) => {
        const Icon = kind === 'work'
          ? (routeIcons.find(entry => entry.match.test(option))?.Icon || Zap)
          : kind === 'property'
            ? (propertyIcons.find(entry => entry.match.test(option))?.Icon || Building2)
            : Clock3;
        const selected = values[item.name] === option;
        return <button type="button" aria-pressed={selected} className={selected ? 'selected' : ''} onClick={() => update(item, option)} key={option}>
          <span>{String(index + 1).padStart(2, '0')}</span><Icon/><strong>{option}</strong>{selected && <Check/>}
        </button>;
      })}
    </div>;
  };

  return <>
    <section className="quote-scope-intro section">
      <div><small>PROJECT SCOPE COMPOSER / 04 STAGES</small><h2>Turn an idea into a <em>priceable brief.</em></h2></div>
      <p>This is not a commitment and it is not a generic contact form. Build the useful first scope, review every detail, then decide when to send it.</p>
      <div className="quote-scope-promises">
        <span><FileCheck2/>Review before send</span>
        <span><ClipboardCheck/>Saved on this device</span>
        <span><ShieldCheck/>No account required</span>
      </div>
    </section>

    <section className="quote-composer section" id="quote-composer" data-route={route.code.split(' / ')[0].toLowerCase()}>
      <aside className="quote-dossier">
        <div className="quote-dossier-media">
          <img src={QUOTE_ASSET} alt="Electrical plans, Type G accessories, tester and a tablet with an organised project layout"/>
          <QuoteScopePlayer/>
          <span>SCOPE INPUT / LIVE</span>
        </div>
        <div className="quote-dossier-ticket">
          <header><span><RouteIcon/></span><div><small>PROJECT ROUTE</small><strong>{workValue}</strong><b>{route.code}</b></div></header>
          <p>{route.note}</p>
          <dl>
            <div><dt>Property</dt><dd>{propertyValue}</dd></div>
            <div><dt>Location</dt><dd>{locationValue || 'Add at stage 02'}</dd></div>
            <div><dt>Timing</dt><dd>{timeframeValue || 'Add at stage 02'}</dd></div>
          </dl>
          <div className="quote-readiness">
            <div><span style={{width: `${readiness}%`}}/></div>
            <p><small>BRIEF READINESS</small><strong>{readiness}%</strong></p>
          </div>
          <div className="quote-draft-state saved"><i/>Draft auto-saves locally</div>
        </div>
      </aside>

      <form className="quote-builder" onSubmit={submit} aria-busy={busy}>
        <header>
          <div><small>BUILD THE BRIEF / {String(step).padStart(2, '0')}</small><h3>{['What are we pricing?', 'Where and when?', 'Who should we contact?', 'Complete and review.'][step - 1]}</h3></div>
          <ol aria-label="Quote request progress">
            {['Project', 'Site', 'Contact', 'Brief'].map((label, index) => <li className={step === index + 1 ? 'active' : step > index + 1 ? 'complete' : ''} key={label}>
              <button type="button" disabled={index + 1 > step || busy} onClick={() => setStep(index + 1)}><span>{step > index + 1 ? <Check/> : `0${index + 1}`}</span>{label}</button>
            </li>)}
          </ol>
        </header>

        {success ? <div className="quote-builder-success" role="status">
          <CheckCircle2/><small>PROJECT BRIEF RECEIVED</small><h4>The scope is now in the NK Electrical review queue.</h4><p>{success}</p>
          <button type="button" onClick={resetDraft}>Build another brief <ArrowRight/></button>
        </div> : <>
          <div className="quote-builder-stage" key={step}>
            {step === 1 && <>
              <div className="quote-stage-copy"><span>01</span><div><h4>Start with the route.</h4><p>Select the work and property context. This immediately shapes the useful questions that follow.</p></div></div>
              <fieldset className="quote-choice-fieldset"><legend>{workField?.label || 'Requirement'}</legend>{selectOptions(workField, 'work')}</fieldset>
              <fieldset className="quote-choice-fieldset"><legend>{propertyField?.label || 'Property type'}</legend>{selectOptions(propertyField, 'property')}</fieldset>
              {fieldsByStep(1).filter(item => ![workField?.name, propertyField?.name].includes(item.name)).map(item => <FieldShell key={item.id} field={item} value={values[item.name] ?? ''} busy={busy} update={update}/>)}
            </>}

            {step === 2 && <>
              <div className="quote-stage-copy"><span>02</span><div><h4>Place it in the real world.</h4><p>Location and programme influence access, coordination and what can be confirmed before a site visit.</p></div></div>
              <div className="quote-fields">
                {locationField && <NicosiaAddressAutocomplete
                  label={locationField.label}
                  required={locationField.required}
                  value={String(values[locationField.name] ?? '')}
                  disabled={busy}
                  onChange={next => update(locationField, next)}
                />}
              </div>
              <fieldset className="quote-choice-fieldset"><legend>{timeframeField?.label || 'Preferred timeframe'}</legend>{selectOptions(timeframeField, 'timeframe')}</fieldset>
              <div className="quote-stage-signal"><CalendarClock/><div><small>PROGRAMME SIGNAL</small><strong>{timeframeValue}</strong><p>A realistic first response may still identify drawings, access or survey information needed before pricing.</p></div></div>
              {fieldsByStep(2).filter(item => ![locationField?.name, timeframeField?.name].includes(item.name)).map(item => <FieldShell key={item.id} field={item} value={values[item.name] ?? ''} busy={busy} update={update}/>)}
            </>}

            {step === 3 && <>
              <div className="quote-stage-copy"><span>03</span><div><h4>Keep the next conversation connected.</h4><p>These details stay attached to the project scope, so you do not need to repeat the context later.</p></div></div>
              <div className="quote-fields quote-fields--contact">
                {fieldsByStep(3).map(item => <FieldShell key={item.id} field={item} value={values[item.name] ?? ''} busy={busy} update={update}/>)}
              </div>
              <div className="quote-contact-assurance">
                <Phone/><span><small>PHONE</small><strong>Useful for practical clarification</strong></span>
                <Mail/><span><small>EMAIL</small><strong>Keeps project information documented</strong></span>
                <ShieldCheck/><span><small>PRIVACY</small><strong>Nothing is sent before stage 04</strong></span>
              </div>
            </>}

            {step === 4 && <>
              <div className="quote-stage-copy"><span>04</span><div><h4>Add what only you know.</h4><p>Mention drawings, existing conditions, quantities, access limitations or the decision you need from us.</p></div></div>
              <div className="quote-fields">
                {fieldsByStep(4).map(item => <FieldShell key={item.id} field={item} value={values[item.name] ?? ''} busy={busy} update={update}/>)}
              </div>
              <div className="quote-review">
                <div><small>ROUTE</small><strong>{workValue}</strong></div>
                <div><small>PROPERTY</small><strong>{propertyValue}</strong></div>
                <div><small>LOCATION</small><strong>{locationValue || '—'}</strong></div>
                <div><small>TIMING</small><strong>{timeframeValue || '—'}</strong></div>
              </div>
              <p className="quote-submit-note">Sending creates a project enquiry in the operational inbox. It is not an automatic price or a commitment to proceed.</p>
            </>}
          </div>

          {error && <p className="quote-builder-error" role="alert">{error}</p>}
          <footer>
            <button className="quote-draft-clear" type="button" disabled={busy} onClick={resetDraft}><Trash2/>Clear draft</button>
            <div>
              {step > 1 && <button className="quote-builder-back" type="button" disabled={busy} onClick={() => setStep(current => current - 1)}><ArrowLeft/>Back</button>}
              {step < 4
                ? <button key="continue" className="quote-builder-next" type="button" onClick={event => {event.preventDefault(); advance();}}>Continue <ArrowRight/></button>
                : <button key="submit" className="quote-builder-submit" type="submit" disabled={busy}>{busy ? <LoaderCircle className="nk-admin-spin"/> : <ClipboardCheck/>}<span>{busy ? 'Sending brief…' : form.submitLabel}</span><ArrowUpRight/></button>}
            </div>
          </footer>
        </>}
      </form>
    </section>

    <section className="quote-pricing-anatomy section">
      <header><small>WHAT MAKES A QUOTE USEFUL</small><h2>Four details prevent <em>expensive assumptions.</em></h2><p>You do not need a finished specification. Tell us what already exists and what information is available.</p></header>
      <div>
        <article><span>01</span><FileImage/><h3>Drawings or photographs</h3><p>Mention whether plans, room photographs or equipment labels are available.</p></article>
        <article><span>02</span><Ruler/><h3>Approximate scale</h3><p>Rooms, floors, quantities and known dimensions help establish the size of the requirement.</p></article>
        <article><span>03</span><Network/><h3>Existing systems</h3><p>Note the current installation, controls, distribution or equipment that must remain.</p></article>
        <article><span>04</span><CalendarClock/><h3>Access and timing</h3><p>Occupied property, construction sequence and target dates change how work is coordinated.</p></article>
      </div>
      <aside><MapPin/><p><strong>Urgent electrical fault?</strong> Do not wait for a quote workflow. Call <a href="tel:+35722494145">+357 22 494145</a> and describe the immediate condition.</p></aside>
    </section>
  </>;
}
