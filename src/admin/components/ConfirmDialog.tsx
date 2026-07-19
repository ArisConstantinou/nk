import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {AlertTriangle, ArrowRight, ShieldCheck, X} from 'lucide-react';
import {createPortal} from 'react-dom';

export type AdminConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  eyebrow?: string;
  detail?: string;
  tone?: 'danger' | 'warning' | 'neutral';
};

type PendingConfirmation = AdminConfirmOptions & {
  resolve: (accepted: boolean) => void;
};

type ConfirmRequest = (options: AdminConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmRequest | null>(null);

export function useAdminConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useAdminConfirm must be used inside AdminConfirmProvider.');
  return confirm;
}

export function AdminConfirmProvider({children}: {children: ReactNode}) {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const pendingRef = useRef<PendingConfirmation | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  const confirm = useCallback<ConfirmRequest>((options) => new Promise(resolve => {
    pendingRef.current?.resolve(false);
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const request = {...options, resolve};
    pendingRef.current = request;
    setPending(request);
  }), []);

  const settle = useCallback((accepted: boolean) => {
    const request = pendingRef.current;
    if (!request) return;
    pendingRef.current = null;
    setPending(null);
    request.resolve(accepted);
    window.setTimeout(() => previousFocusRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!pending || !dialogRef.current) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )];
    dialog.querySelector<HTMLElement>('[data-confirm-cancel]')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        settle(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = focusable();
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return () => {
      dialog.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [pending, settle]);

  useEffect(() => () => pendingRef.current?.resolve(false), []);

  const tone = pending?.tone || 'warning';

  return <ConfirmContext.Provider value={confirm}>
    {children}
    {pending && createPortal(
      <div
        className="nk-admin-confirm-backdrop"
        role="presentation"
        onMouseDown={event => {
          if (event.target === event.currentTarget) settle(false);
        }}
      >
        <section
          ref={dialogRef}
          className={`nk-admin-confirm nk-admin-confirm--${tone}`}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
        >
          <header>
            <span>{tone === 'danger' ? <AlertTriangle/> : <ShieldCheck/>}</span>
            <button type="button" aria-label="Cancel and close confirmation" onClick={() => settle(false)}><X/></button>
          </header>
          <main>
            <small>{pending.eyebrow || (tone === 'danger' ? 'PERMANENT ACTION' : 'CONFIRM CHANGE')}</small>
            <h2 id={titleId}>{pending.title}</h2>
            <p id={descriptionId}>{pending.description}</p>
            {pending.detail && <div><ShieldCheck/><span>{pending.detail}</span></div>}
          </main>
          <footer>
            <button type="button" data-confirm-cancel onClick={() => settle(false)}>
              {pending.cancelLabel || 'Keep current'}
            </button>
            <button
              type="button"
              className="nk-admin-confirm__accept"
              data-confirm-accept
              onClick={() => settle(true)}
            >
              {pending.confirmLabel || 'Confirm'}<ArrowRight/>
            </button>
          </footer>
        </section>
      </div>,
      document.body,
    )}
  </ConfirmContext.Provider>;
}
