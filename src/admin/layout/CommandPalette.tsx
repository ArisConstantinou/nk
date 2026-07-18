import {useEffect, useMemo, useRef, useState, type RefObject} from 'react';
import {ArrowRight, ExternalLink, LoaderCircle, Pin, PinOff, Search, Sparkles, X} from 'lucide-react';
import {useNavigate} from 'react-router-dom';
import {adminApi, errorMessage} from '../api';
import type {AdminRole, AdminSearchResult} from '../types';
import {canManageEnquiries, canManageInteractive, canManageUsers, canReadForms, canReadKind, canReadMedia, canReadNavigation} from '../permissions';
import {isPagesAdminMode} from '../pagesMode';

type Command = {id: string; label: string; group: string; description: string; to: string; external?: boolean};
type PaletteItem = Command & {searchResult?: AdminSearchResult};
type CloseReason = 'dismiss' | 'select';

const commands: Omit<Command, 'id'>[] = [
  {label: 'Dashboard', group: 'Overview', description: 'Content status, drafts, alerts and recent activity', to: '/admin/dashboard'},
  {label: 'Website Editor', group: 'Overview', description: 'Edit website pages and homepage content', to: '/admin/pages'},
  {label: 'Pages', group: 'Content', description: 'Create, route, publish and connect pages to navigation', to: '/admin/site-pages'},
  {label: 'Services', group: 'Content', description: 'Service descriptions and deliverables', to: '/admin/services'},
  {label: 'Projects', group: 'Content', description: 'Project archive and completion dates', to: '/admin/projects'},
  {label: 'Company', group: 'Content', description: 'Company story and partnerships', to: '/admin/company'},
  {label: 'Products', group: 'Shop', description: 'Products, categories and descriptions', to: '/admin/products'},
  {label: 'Catalogues', group: 'Shop', description: 'PDFs and official catalogue links', to: '/admin/catalogues'},
  {label: 'Form Submissions', group: 'Customers', description: 'Public forms and stored submissions', to: '/admin/forms'},
  {label: 'Enquiries', group: 'Customers', description: 'Customer requests and lead follow-up', to: '/admin/enquiries'},
  {label: 'Media', group: 'Media', description: 'Images, video and PDF files', to: '/admin/media'},
  {label: 'Interactive Studio', group: 'Content', description: 'Build frame-based reusable interactive experiences', to: '/admin/interactive'},
  {label: 'Site Settings', group: 'Settings', description: 'Global layout, CTAs and contact details', to: '/admin/settings'},
  {label: 'Navigation', group: 'Content', description: 'Primary, mega-menu and footer links inside Pages', to: '/admin/site-pages?navigation=1'},
  {label: 'SEO', group: 'Settings', description: 'Search titles and route metadata', to: '/admin/seo'},
  {label: 'Users', group: 'Administration', description: 'Team access and permissions', to: '/admin/users'},
  {label: 'Audit Log', group: 'Administration', description: 'Who changed what and when', to: '/admin/audit'},
  {label: 'Your profile', group: 'Account', description: 'Identity and password security', to: '/admin/profile'},
  {label: 'View public website', group: 'Quick action', description: 'Open NK Electrical in a new tab', to: '/', external: true},
];

function permitted(command: Omit<Command, 'id'>, role: AdminRole) {
  if (isPagesAdminMode && (command.to === '/admin/users' || command.to === '/admin/profile')) return false;
  if (command.to === '/admin/pages' || command.to === '/admin/site-pages') return canReadKind(role, 'page');
  if (command.to === '/admin/services') return canReadKind(role, 'service');
  if (command.to === '/admin/products') return canReadKind(role, 'product');
  if (command.to === '/admin/catalogues') return canReadKind(role, 'catalogue');
  if (command.to === '/admin/projects') return canReadKind(role, 'project');
  if (command.to === '/admin/company') return canReadKind(role, 'company');
  if (command.to === '/admin/seo') return canReadKind(role, 'seo');
  if (command.to === '/admin/settings') return canReadKind(role, 'settings');
  if (command.to === '/admin/enquiries') return canManageEnquiries(role);
  if (command.to === '/admin/media') return canReadMedia(role);
  if (command.to === '/admin/interactive') return !isPagesAdminMode && canManageInteractive(role);
  if (command.to === '/admin/site-pages?navigation=1') return canReadNavigation(role);
  if (command.to === '/admin/forms') return canReadForms(role);
  if (command.to === '/admin/users') return canManageUsers(role);
  return true;
}

const groupLabel = (type: AdminSearchResult['type']) => ({content: 'Website content', media: 'Media library', navigation: 'Navigation', forms: 'Forms', enquiries: 'Enquiries', users: 'Team'}[type]);

export function CommandPalette({open, onClose, role, fallbackFocusRef, guided = false}: {
  open: boolean;
  onClose: (reason?: CloseReason) => void;
  role: AdminRole;
  fallbackFocusRef: RefObject<HTMLButtonElement | null>;
  guided?: boolean;
}) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const requestSequence = useRef(0);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<AdminSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const available = useMemo(() => commands.filter(command => permitted(command, role)).map(command => ({...command, id: `command:${command.to}`})), [role]);
  const items = useMemo<PaletteItem[]>(() => query.trim().length >= 2
    ? remote.map(result => ({id: `${result.type}:${result.id}`, label: result.title, group: groupLabel(result.type), description: result.description, to: result.to, searchResult: result}))
    : available.filter(command => !query || `${command.label} ${command.group} ${command.description}`.toLowerCase().includes(query.toLowerCase())), [available, query, remote]);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery('');
    setActive(0);
    setRemote([]);
    setSearchError('');
    window.setTimeout(() => inputRef.current?.focus(), 20);
    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose('dismiss');
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href]')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keepFocusInside);
    return () => {
      document.removeEventListener('keydown', keepFocusInside);
      const previous = previouslyFocusedRef.current;
      window.setTimeout(() => {
        const canRestore = previous && previous !== document.body && previous.isConnected && getComputedStyle(previous).visibility !== 'hidden' && !previous.closest('[inert]');
        if (canRestore) previous.focus();
        else fallbackFocusRef.current?.focus();
      }, 0);
    };
  }, [fallbackFocusRef, onClose, open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setRemote([]);
      setSearching(false);
      setSearchError('');
      return;
    }
    const sequence = ++requestSequence.current;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError('');
      try {
        const result = await adminApi<{results: AdminSearchResult[]}>(`/search?q=${encodeURIComponent(query.trim())}`);
        if (requestSequence.current === sequence) setRemote(result.results);
      } catch (error) {
        if (requestSequence.current === sequence) setSearchError(errorMessage(error));
      } finally {
        if (requestSequence.current === sequence) setSearching(false);
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  useEffect(() => {
    if (active >= items.length) setActive(Math.max(0, items.length - 1));
  }, [active, items.length]);

  if (!open) return null;

  const trimmedQuery = query.trim();
  const showSearchGuide = guided && trimmedQuery.length > 0;
  const guideLanguage = typeof window !== 'undefined' && window.localStorage.getItem('nk-admin-guide-language') === 'el' ? 'el' : 'en';
  const run = (item: PaletteItem) => {
    onClose('select');
    if (item.external) window.open(item.to, '_blank', 'noopener,noreferrer');
    else navigate(item.to);
  };
  const togglePin = async (item: PaletteItem) => {
    const result = item.searchResult;
    if (!result || !['content', 'media'].includes(result.type)) return;
    try {
      const response = await adminApi<{active: boolean}>(`/favorites/${result.type}/${result.id}`, {method: 'PUT', body: JSON.stringify({active: !result.favorite})});
      setRemote(current => current.map(value => value.id === result.id && value.type === result.type ? {...value, favorite: response.active} : value));
    } catch (error) {
      setSearchError(errorMessage(error));
    }
  };

  return <div className="nk-admin-command-backdrop" role="presentation" onMouseDown={event => {if (event.target === event.currentTarget) onClose('dismiss');}}>
    <section ref={dialogRef} className="nk-admin-command nk-admin-command--global" role="dialog" aria-modal="true" aria-label="Search all website data">
      <header className="nk-admin-command-searchbar">
        <label className="nk-admin-command-searchfield">
          <span className="nk-admin-command-searchmark" aria-hidden="true"><Search/></span>
          <span className="nk-admin-command-searchcopy">
            <small>SEARCH NK ADMIN</small>
            <input ref={inputRef} role="combobox" aria-expanded="true" aria-controls="admin-command-results" aria-activedescendant={items[active] ? `admin-command-${active}` : undefined} value={query} onChange={event => {setQuery(event.target.value); setActive(0);}} onKeyDown={event => {
              if (event.key === 'ArrowDown') {event.preventDefault(); setActive(value => Math.min(items.length - 1, value + 1));}
              if (event.key === 'ArrowUp') {event.preventDefault(); setActive(value => Math.max(0, value - 1));}
              if (event.key === 'Enter' && items[active]) {event.preventDefault(); run(items[active]);}
            }} placeholder="Search content, media, people, forms or enquiries…" aria-label="Search all website data"/>
          </span>
        </label>
        <kbd>ESC</kbd>
        <button type="button" onClick={() => onClose('dismiss')} aria-label="Close search"><X/></button>
      </header>

      <div className="nk-admin-command-status" aria-live="polite">
        <span>{trimmedQuery.length < 2 ? 'Quick destinations' : 'Live website results'}</span>
        <b>{trimmedQuery.length >= 2 ? `${remote.length} result${remote.length === 1 ? '' : 's'}` : `${items.length} destination${items.length === 1 ? '' : 's'}`}</b>
      </div>
      {searching && <div className="nk-admin-command-progress"><LoaderCircle className="nk-admin-spin"/>Searching live website data…</div>}
      {searchError && <p className="nk-admin-command-error" role="alert">{searchError}</p>}

      <div className={`nk-admin-command-body ${showSearchGuide ? 'has-guide' : ''}`}>
        <div id="admin-command-results" role="listbox" aria-label="Search results">
          {items.length ? items.map((item, index) => <div id={`admin-command-${index}`} role="option" aria-selected={active === index} className={`nk-admin-command-result ${active === index ? 'active' : ''}`} onMouseEnter={() => setActive(index)} key={item.id}>
            <button type="button" className="nk-admin-command-main" onClick={() => run(item)}><span><small>{item.group}{item.searchResult?.status ? ` · ${item.searchResult.status}` : ''}</small><b>{item.label}</b><em>{item.description}</em></span>{item.external ? <ExternalLink/> : <ArrowRight/>}</button>
            {item.searchResult && ['content', 'media'].includes(item.searchResult.type) && <button type="button" className="nk-admin-command-pin" onClick={() => void togglePin(item)} aria-label={`${item.searchResult.favorite ? 'Unpin' : 'Pin'} ${item.label}`}>{item.searchResult.favorite ? <PinOff/> : <Pin/>}</button>}
          </div>) : !searching && <div className="nk-admin-command-empty">
            <span aria-hidden="true"><Search/></span>
            <b>{trimmedQuery.length === 1 ? 'Type one more character' : `No results for “${trimmedQuery}”`}</b>
            <p>{trimmedQuery.length === 1 ? 'Two characters unlock the full search across live website data.' : 'Try a page title, slug, filename, category, tag, customer or team member.'}</p>
            {trimmedQuery && <button type="button" onClick={() => {setQuery(''); setActive(0); inputRef.current?.focus();}}>Clear search</button>}
          </div>}
        </div>

        {showSearchGuide && <aside className="nk-admin-search-guide" aria-label={guideLanguage === 'el' ? 'Οδηγός αναζήτησης' : 'Search guide'}>
          <div><Sparkles/><span>{guideLanguage === 'el' ? 'ΟΔΗΓΟΣ ΑΝΑΖΗΤΗΣΗΣ' : 'SEARCH GUIDE'}</span></div>
          <h2>{guideLanguage === 'el' ? 'Βρες οτιδήποτε χωρίς να φύγεις από την εργασία σου.' : 'Find anything without leaving your work.'}</h2>
          <p>{guideLanguage === 'el' ? 'Η αναζήτηση ελέγχει περιεχόμενο, media, πλοήγηση, φόρμες, αιτήματα και χρήστες στους οποίους έχεις πρόσβαση.' : 'Search checks content, media, navigation, forms, enquiries and users you are allowed to access.'}</p>
          <ol>
            <li><b>1</b><span>{guideLanguage === 'el' ? 'Γράψε τουλάχιστον δύο χαρακτήρες.' : 'Type at least two characters.'}</span></li>
            <li><b>2</b><span>{guideLanguage === 'el' ? 'Χρησιμοποίησε ↑ και ↓ για να επιλέξεις αποτέλεσμα.' : 'Use ↑ and ↓ to choose a result.'}</span></li>
            <li><b>3</b><span>{guideLanguage === 'el' ? 'Πάτησε Enter για άνοιγμα ή την καρφίτσα για αποθήκευση στα αγαπημένα.' : 'Press Enter to open it, or use the pin to save a favourite.'}</span></li>
          </ol>
          <small>{guideLanguage === 'el' ? 'Το Esc κλείνει την αναζήτηση και επιστρέφει στον κύριο οδηγό.' : 'Esc closes search and returns you to the main guide.'}</small>
        </aside>}
      </div>

      <footer><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span>{trimmedQuery.length >= 2 ? `${remote.length} live result${remote.length === 1 ? '' : 's'}` : 'Type two characters to search all permitted data'}</span></footer>
    </section>
  </div>;
}
