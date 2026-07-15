import {useRef, useState, type FormEvent} from 'react';
import {ArrowUpRight, Check, LoaderCircle} from 'lucide-react';
import {useContent} from '../context/ContentContext';

type ManagedPublicFormProps = {
  slug: string;
  title: string;
  eyebrow: string;
  className?: string;
  defaults?: Record<string, string>;
  hiddenValues?: Record<string, string>;
};

export function ManagedPublicForm({slug, title, eyebrow, className = 'contact-form', defaults = {}, hiddenValues = {}}: ManagedPublicFormProps) {
  const {formBySlug, submitForm} = useContent();
  const form = formBySlug(slug);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const statusRef = useRef<HTMLParagraphElement>(null);

  if (!form) return <div className={`${className} managed-form-unavailable`} role="status"><div className="form-intro"><span>{eyebrow}</span><h2>{title}</h2></div><p>This form is temporarily unavailable. Please use the telephone or email shown on this page.</p></div>;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError('');
    setMessage('');
    const data = new FormData(formElement);
    const values: Record<string, string | boolean> = {...hiddenValues};
    for (const field of form.fields.filter(field => field.active)) {
      values[field.name] = field.type === 'checkbox' ? data.get(field.name) === 'on' : String(data.get(field.name) || '');
    }
    values.website = String(data.get('website') || '');
    try {
      setMessage(await submitForm(slug, values));
      formElement.reset();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The form could not be submitted.');
    } finally {
      setBusy(false);
      window.requestAnimationFrame(() => statusRef.current?.focus());
    }
  };

  return <form className={className} onSubmit={submit} aria-busy={busy}>
    <div className="form-intro"><span>{eyebrow}</span><h2>{title}</h2></div>
    <label className="managed-form-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
    {form.fields.filter(field => field.active).map(field => <label key={field.id}>
      {field.label}
      {field.type === 'textarea'
        ? <textarea name={field.name} rows={6} required={field.required} maxLength={5000} disabled={busy} placeholder={field.placeholder} defaultValue={defaults[field.name]}/>
        : field.type === 'select'
          ? <select name={field.name} required={field.required} disabled={busy} defaultValue={defaults[field.name] || field.options[0]}>{field.options.map(option => <option key={option}>{option}</option>)}</select>
          : field.type === 'checkbox'
            ? <span className="managed-form-checkbox"><input name={field.name} type="checkbox" required={field.required} disabled={busy} defaultChecked={defaults[field.name] === 'true'}/><span>{field.placeholder || field.label}</span></span>
            : <input name={field.name} type={field.type} required={field.required} maxLength={500} disabled={busy} placeholder={field.placeholder} defaultValue={defaults[field.name]} autoComplete={field.name === 'name' ? 'name' : field.type === 'email' ? 'email' : field.type === 'tel' ? 'tel' : undefined}/>}
    </label>)}
    <button className="button copper" type="submit" disabled={busy}>{busy ? <LoaderCircle className="nk-admin-spin"/> : form.submitLabel}<ArrowUpRight/></button>
    {message && <p ref={statusRef} className="form-note" role="status" tabIndex={-1}><Check/>{message}</p>}
    {error && <p ref={statusRef} className="form-note form-note--error" role="alert" tabIndex={-1}>{error}</p>}
  </form>;
}
