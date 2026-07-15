import {AlertTriangle, LoaderCircle, RefreshCw} from 'lucide-react';

export function AdminLoading({label = 'Loading secure workspace…'}: {label?: string}) {
  return <div className="nk-admin-state"><LoaderCircle className="nk-admin-spin"/><strong>{label}</strong></div>;
}

export function AdminError({message, retry}: {message: string; retry?: () => void}) {
  return <div className="nk-admin-state nk-admin-state--error"><AlertTriangle/><strong>Unable to continue</strong><p>{message}</p>{retry && <button type="button" onClick={retry}><RefreshCw/>Try again</button>}</div>;
}

export function PageHeading({eyebrow, title, description, actions}: {eyebrow: string; title: string; description: string; actions?: React.ReactNode}) {
  return <header className="nk-admin-page-heading"><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="nk-admin-page-actions">{actions}</div>}</header>;
}

export function EmptyState({title, body}: {title: string; body: string}) {
  return <div className="nk-admin-empty"><strong>{title}</strong><p>{body}</p></div>;
}
