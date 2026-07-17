import {useEffect, useRef, useState} from 'react';
import {Check, Copy, Facebook, Linkedin, Mail, MessageCircle, Share2, X} from 'lucide-react';
import type {Product} from '../types';

function productShareUrl(productId: string) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return new URL(`${base}/shop/product/${encodeURIComponent(productId)}`, window.location.origin).toString();
}

export function ProductShareActions({product}: {product: Product}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const url = productShareUrl(product.id);
  const message = `Take a look at ${product.name} from NK Electrical`;
  const encodedUrl = encodeURIComponent(url);
  const encodedMessage = encodeURIComponent(`${message}: ${url}`);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt('Copy this product link', url);
    }
  };

  return <div className={`product-share${open ? ' is-open' : ''}`} ref={rootRef}>
    <button
      className="product-share__trigger"
      type="button"
      aria-label={`Share ${product.name}`}
      aria-expanded={open}
      onClick={() => setOpen(value => !value)}
    >
      {open ? <X/> : <Share2/>}
      <span>Share</span>
    </button>
    {open && <div className="product-share__menu" role="menu" aria-label={`Share ${product.name}`}>
      <strong>Share product</strong>
      <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noreferrer" role="menuitem" onClick={() => setOpen(false)}><Facebook/><span>Facebook</span></a>
      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noreferrer" role="menuitem" onClick={() => setOpen(false)}><Linkedin/><span>LinkedIn</span></a>
      <a href={`https://wa.me/?text=${encodedMessage}`} target="_blank" rel="noreferrer" role="menuitem" onClick={() => setOpen(false)}><MessageCircle/><span>WhatsApp</span></a>
      <a href={`mailto:?subject=${encodeURIComponent(product.name)}&body=${encodedMessage}`} role="menuitem" onClick={() => setOpen(false)}><Mail/><span>Email</span></a>
      <button type="button" role="menuitem" onClick={copyLink}>{copied ? <Check/> : <Copy/>}<span>{copied ? 'Link copied' : 'Copy link'}</span></button>
    </div>}
  </div>;
}
