import {useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {MoreHorizontal} from 'lucide-react';

type ActionMenuProps = {
  children: ReactNode;
  label?: string;
  compact?: boolean;
  placement?: 'top' | 'bottom';
  disabled?: boolean;
};

type MenuPosition = {left: number; top?: number; bottom?: number};

export function ActionMenu({children, label = 'More actions', compact = false, placement = 'bottom', disabled = false}: ActionMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({left: 8, top: 8});
  const menuId = useId();

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight || 0;
    const panelWidth = Math.min(240, window.innerWidth - 16);
    const left = Math.max(8, Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - 8));
    const shouldOpenAbove = placement === 'top' || rect.bottom + panelHeight + 15 > window.innerHeight;
    setPosition(shouldOpenAbove
      ? {left, bottom: Math.max(8, window.innerHeight - rect.top + 7)}
      : {left, top: Math.min(window.innerHeight - 8, rect.bottom + 7)});
  }, [open, placement]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {close(); triggerRef.current?.focus();}
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [open]);

  return <>
    <button
      ref={triggerRef}
      type="button"
      className={`nk-admin-action-trigger${compact ? ' compact' : ''}`}
      aria-label={label}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? menuId : undefined}
      disabled={disabled}
      onClick={() => setOpen(value => !value)}
    >
      <MoreHorizontal/>{!compact && <span>More</span>}
    </button>
    {open && createPortal(
      <div
        ref={panelRef}
        id={menuId}
        role="menu"
        aria-label={label}
        className="nk-admin-action-popover"
        style={position}
        onClick={event => {
          if ((event.target as Element).closest('button,a')) setOpen(false);
        }}
      >{children}</div>,
      document.body,
    )}
  </>;
}
