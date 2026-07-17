import {useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent, type ReactNode} from 'react';
import {ArrowDown, ArrowUp, Building2, Check, ChevronRight, ExternalLink, Globe2, GripVertical, Image as ImageIcon, LayoutTemplate, LoaderCircle, Mail, MapPin, Megaphone, Phone, Plus, Rocket, Save, Search, Share2, Trash2, Upload, X} from 'lucide-react';
import {adminApi, errorMessage} from '../api';
import {useAdminAuth} from '../auth/AdminAuth';
import {AdminError, AdminLoading, PageHeading} from '../components/AdminStates';
import {ActionMenu} from '../components/ActionMenu';
import {canWriteKind} from '../permissions';
import type {ContentRecord, MediaAsset} from '../types';
import type {SiteEmail, SiteLocation, SiteOpeningHours, SitePhone, SiteSettings, SiteSocialLink} from '../../context/ContentContext';

type SettingsData = SiteSettings & {enquiryRecipient: string; globalComponents?: unknown[]};
type Tab = 'brand' | 'contact' | 'social' | 'seo' | 'layout';
const iconChoices = ['globe', 'facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'x', 'whatsapp', 'pinterest', 'telegram'];
const placementChoices: SiteSocialLink['placements'] = ['header', 'footer', 'mobile', 'contact'];
const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {const reader = new FileReader(); reader.onerror = () => reject(new Error('The icon could not be read.')); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.readAsDataURL(file);});
const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const defaults: SettingsData = {
  address: '72 Makedonitissis Str., Strovolos 2057, Cyprus', phone: '+357 22 494145', email: 'info@nk-electrical.com', hours: 'Mon, Tue, Thu, Fri: 09:00–18:00\nWednesday, Saturday: 09:00–14:00\nSunday: Closed', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=72+Makedonitissis+Strovolos+2057+Cyprus', mapEmbedUrl: '', enquiryRecipient: 'info@nk-electrical.com',
  brandName: 'NK Electrical', brandTagline: 'Power · Light · Control', logoUrl: '/assets/nk-logo-transparent-v2.png', logoAlt: 'NK Electrical', faviconUrl: '/assets/nk-favicon.png', defaultSocialImage: '', siteName: 'NK Electrical', defaultMetaTitle: '', defaultMetaDescription: '', language: 'en', locale: 'en_CY', quoteLabel: 'Request a Quote', quoteUrl: '/request-a-quote', footerEyebrow: 'PROJECT LINE / CYPRUS', footerTitle: 'Define the requirement. Then build it properly.', footerCtaLabel: 'Request a Quote', footerCopyright: 'NK Electrical Ltd. · Since 1985',
  phones: [{id: 'primary-phone', label: 'Main', number: '+357 22 494145', active: true, primary: true}], emails: [{id: 'primary-email', label: 'General', address: 'info@nk-electrical.com', active: true, primary: true}], locations: [{id: 'primary-location', label: 'Main store', address: '72 Makedonitissis Str., Strovolos 2057, Cyprus', mapsUrl: 'https://www.google.com/maps/search/?api=1&query=72+Makedonitissis+Strovolos+2057+Cyprus', active: true, primary: true}], openingHours: [{id: 'store-hours', label: 'Store', hours: 'Mon, Tue, Thu, Fri: 09:00–18:00\nWednesday, Saturday: 09:00–14:00\nSunday: Closed', active: true}], socialLinks: [], header: {sticky: true, showTagline: true, showSocials: false}, footer: {showSocials: true, showContact: true, showHours: false}, globalComponents: [],
};

function normalize(record: ContentRecord): SettingsData {
  const value = record.draft;
  return {
    ...defaults, ...value,
    phones: Array.isArray(value.phones) ? value.phones as SitePhone[] : defaults.phones,
    emails: Array.isArray(value.emails) ? value.emails as SiteEmail[] : defaults.emails,
    locations: Array.isArray(value.locations) ? value.locations as SiteLocation[] : defaults.locations,
    openingHours: Array.isArray(value.openingHours) ? value.openingHours as SiteOpeningHours[] : defaults.openingHours,
    socialLinks: Array.isArray(value.socialLinks) ? value.socialLinks as SiteSocialLink[] : [],
    header: value.header && typeof value.header === 'object' ? {...defaults.header, ...value.header as SettingsData['header']} : defaults.header,
    footer: value.footer && typeof value.footer === 'object' ? {...defaults.footer, ...value.footer as SettingsData['footer']} : defaults.footer,
  } as SettingsData;
}

function syncPrimary(value: SettingsData): SettingsData {
  const phone = value.phones.find(item => item.primary && item.active) || value.phones.find(item => item.active);
  const email = value.emails.find(item => item.primary && item.active) || value.emails.find(item => item.active);
  const location = value.locations.find(item => item.primary && item.active) || value.locations.find(item => item.active);
  const hours = value.openingHours.find(item => item.active);
  return {...value, phone: phone?.number || value.phone, email: email?.address || value.email, address: location?.address || value.address, mapsUrl: location?.mapsUrl || value.mapsUrl, hours: hours?.hours || value.hours};
}

function Field({label, hint, wide, children}: {label: string; hint?: string; wide?: boolean; children: ReactNode}) {
  return <label className={wide ? 'wide' : ''}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}

function MediaSelect({label, value, assets, onChange, hint}: {label: string; value: string; assets: MediaAsset[]; onChange: (value: string) => void; hint?: string}) {
  const selected = assets.find(item => item.url === value);
  return <Field label={label} hint={hint} wide><div className="nk-settings-media-field">{value ? <img src={value} alt=""/> : <ImageIcon/>}<select value={value} onChange={event => onChange(event.target.value)}><option value="">No managed asset</option>{assets.filter(item => item.mimeType.startsWith('image/') && item.active).map(item => <option value={item.url} key={item.id}>{item.folder} / {item.title || item.filename}</option>)}</select>{selected && <a href={selected.url} target="_blank" rel="noreferrer" aria-label={`Preview ${selected.filename}`}><ExternalLink/></a>}</div></Field>;
}

export function SettingsPage() {
  const {user} = useAdminAuth();
  const canWrite = Boolean(user && canWriteKind(user.role, 'settings'));
  const [record, setRecord] = useState<ContentRecord | null>(null);
  const [draft, setDraft] = useState<SettingsData>(defaults);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [tab, setTab] = useState<Tab>('brand');
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [draggedSocial, setDraggedSocial] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const nonce = useRef(crypto.randomUUID());

  const previewPath = tab === 'contact' || tab === 'social' ? '/contact' : '/';
  const frameWidth = device === 'desktop' ? 1440 : device === 'tablet' ? 820 : 390;
  const frameScale = device === 'desktop' ? .48 : device === 'tablet' ? .62 : .9;

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [contentResult, mediaResult] = await Promise.all([adminApi<{records: ContentRecord[]}>('/content?kind=settings'), adminApi<{media: MediaAsset[]}>('/media')]);
      const current = contentResult.records.find(item => item.slug === 'business-details') || contentResult.records[0];
      if (!current) throw new Error('The website settings record is missing. Sign in as owner to initialize the site content.');
      setRecord(current); setDraft(normalize(current)); setAssets(mediaResult.media); setDirty(false);
    } catch (nextError) {setError(errorMessage(nextError));}
    finally {setLoading(false);}
  };
  useEffect(() => {void load();}, []);

  const sendPreview = (next: SettingsData = draft) => {
    if (!record || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({type: 'nk-visual-editor:records', nonce: nonce.current, editableKinds: ['settings'], records: [{id: record.id, kind: record.kind, slug: record.slug, title: record.title, data: next, position: record.position, publishedAt: record.publishedAt || ''}]}, window.location.origin);
  };
  useEffect(() => {sendPreview();}, [draft, record?.id, previewPath]);
  useEffect(() => {
    const onPreviewMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow || !event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'nk-visual-editor:ready' && event.data.nonce === nonce.current) sendPreview();
    };
    window.addEventListener('message', onPreviewMessage);
    return () => window.removeEventListener('message', onPreviewMessage);
  }, [draft, record]);
  const mutate = (updater: (value: SettingsData) => SettingsData) => {setDraft(current => {const next = syncPrimary(updater(current)); queueMicrotask(() => sendPreview(next)); return next;}); setDirty(true); setNotice('');};
  const setValue = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => mutate(current => ({...current, [key]: value}));
  const updateList = <K extends 'phones' | 'emails' | 'locations' | 'openingHours' | 'socialLinks'>(key: K, index: number, patch: Partial<SettingsData[K][number]>) => mutate(current => ({...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? {...item, ...patch} : item)}));
  const removeList = <K extends 'phones' | 'emails' | 'locations' | 'openingHours' | 'socialLinks'>(key: K, index: number) => mutate(current => ({...current, [key]: current[key].filter((_, itemIndex) => itemIndex !== index)}));
  const makePrimary = (key: 'phones' | 'emails' | 'locations', index: number) => mutate(current => ({...current, [key]: current[key].map((item, itemIndex) => ({...item, primary: itemIndex === index}))}));

  const save = async (source: SettingsData = draft) => {
    if (!record || !canWrite) return record;
    setBusy(true); setError('');
    try {
      const result = await adminApi<{record: ContentRecord}>(`/content/${record.id}`, {method: 'PUT', body: JSON.stringify({kind: 'settings', title: record.title, slug: record.slug, data: syncPrimary(source), category: record.category, tags: record.tags, expectedVersion: record.version})});
      setRecord(result.record); setDraft(normalize(result.record)); setDirty(false); setNotice('Draft settings saved safely. The public website is unchanged until publish.'); return result.record;
    } catch (nextError) {setError(errorMessage(nextError)); return null;}
    finally {setBusy(false);}
  };
  const publish = async () => {
    if (!record || !canWrite) return;
    setBusy(true); setError('');
    try {
      let current = record;
      if (dirty) {
        const result = await adminApi<{record: ContentRecord}>(`/content/${record.id}`, {method: 'PUT', body: JSON.stringify({kind: 'settings', title: record.title, slug: record.slug, data: syncPrimary(draft), category: record.category, tags: record.tags, expectedVersion: record.version})});
        current = result.record;
      }
      const result = await adminApi<{record: ContentRecord}>(`/content/${current.id}/publish`, {method: 'POST', body: JSON.stringify({expectedVersion: current.version})});
      setRecord(result.record); setDraft(normalize(result.record)); setDirty(false); setNotice('Settings published. The live website now uses this configuration.');
    } catch (nextError) {setError(errorMessage(nextError));} finally {setBusy(false);}
  };
  const moveSocial = (fromId: string, toId: string) => {if (fromId === toId) return; mutate(current => {const next = [...current.socialLinks]; const from = next.findIndex(item => item.id === fromId); const to = next.findIndex(item => item.id === toId); if (from < 0 || to < 0) return current; const [item] = next.splice(from, 1); next.splice(to, 0, item); return {...current, socialLinks: next};});};
  const moveSocialBy = (index: number, direction: -1 | 1) => {const target = index + direction; if (target < 0 || target >= draft.socialLinks.length) return; moveSocial(draft.socialLinks[index].id, draft.socialLinks[target].id);};
  const beginSocialDrag = (event: DragEvent<HTMLElement>, itemId: string) => {event.dataTransfer.setData('text/plain', itemId); event.dataTransfer.effectAllowed = 'move'; setDraggedSocial(itemId);};
  const dropSocial = (event: DragEvent<HTMLElement>, targetId: string) => {event.preventDefault(); const sourceId = event.dataTransfer.getData('text/plain') || draggedSocial; if (sourceId) moveSocial(sourceId, targetId); setDraggedSocial(null);};
  const uploadIcon = async (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; if (!file?.size) return; setBusy(true); setError('');
    try {const base64 = await fileToBase64(file); const platform = draft.socialLinks[index].platform || 'Social'; const result = await adminApi<{media: MediaAsset}>('/media', {method: 'POST', body: JSON.stringify({filename: file.name, mimeType: file.type, base64, title: `${platform} icon`, altText: `${platform} icon`, folder: 'Brand', category: 'Social icons', caption: ''})}); setAssets(current => [...current, result.media]); updateList('socialLinks', index, {iconUrl: result.media.url}); setNotice('Custom social icon uploaded and selected.');} catch (nextError) {setError(errorMessage(nextError));} finally {setBusy(false); event.target.value = '';}
  };

  const tabs = useMemo(() => ([
    {id: 'brand' as const, label: 'Brand & assets', icon: ImageIcon}, {id: 'contact' as const, label: 'Contact & locations', icon: MapPin}, {id: 'social' as const, label: 'Social media', icon: Share2}, {id: 'seo' as const, label: 'SEO defaults', icon: Search}, {id: 'layout' as const, label: 'Header & footer', icon: LayoutTemplate},
  ]), []);

  if (loading) return <AdminLoading label="Loading website settings…"/>;
  if (!record) return <AdminError message={error || 'Website settings are unavailable.'} retry={() => void load()}/>;

  return <div className="nk-settings-page">
    <PageHeading eyebrow="GLOBAL WEBSITE CONTROL" title="Website settings" description="Manage brand assets, contact details, social links, SEO defaults and global layout without changing code."/>
    {error && <p className="nk-admin-alert nk-admin-alert--error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X/></button></p>}
    {notice && <p className="nk-admin-alert" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message"><X/></button></p>}
    <div className="nk-settings-toolbar"><div className={`nk-settings-state ${dirty ? 'draft' : 'saved'}`}>{dirty ? <Megaphone/> : <Check/>}<span><b>{dirty ? 'Unsaved draft' : record.status === 'published' ? 'Saved and published' : 'Draft saved'}</b><small>Version {record.version} · live preview updates immediately</small></span></div><div className="nk-settings-devices" aria-label="Preview device">{(['desktop', 'tablet', 'mobile'] as const).map(value => <button className={device === value ? 'active' : ''} onClick={() => setDevice(value)} key={value}>{value}</button>)}</div>{canWrite && <><button data-guide="save-site-settings" onClick={() => void save()} disabled={busy || !dirty}><Save/>{busy ? 'Working…' : 'Save draft'}</button><button className="nk-admin-primary" onClick={() => void publish()} disabled={busy}><Rocket/>Publish</button></>}</div>
    <div className="nk-settings-workspace">
      <aside><nav aria-label="Settings sections">{tabs.map(item => <button data-guide={`settings-tab-${item.id}`} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)} key={item.id}><item.icon/><span>{item.label}</span><ChevronRight/></button>)}</nav><p><Globe2/><span><b>Draft-safe preview</b>Your edits appear on the right now. Visitors see them only after publishing.</span></p></aside>
      <main>
        {tab === 'brand' && <section className="nk-settings-section"><header><ImageIcon/><div><span>IDENTITY</span><h2>Brand and website assets</h2><p>Use managed library assets for the logo, favicon and default sharing image.</p></div></header><div className="nk-settings-fields"><Field label="Brand name"><input value={draft.brandName} onChange={event => setValue('brandName', event.target.value)}/></Field><Field label="Brand tagline"><input value={draft.brandTagline} onChange={event => setValue('brandTagline', event.target.value)}/></Field><Field label="Logo alternative text"><input value={draft.logoAlt} onChange={event => setValue('logoAlt', event.target.value)}/></Field><Field label="Site name"><input value={draft.siteName} onChange={event => setValue('siteName', event.target.value)}/></Field><MediaSelect label="Primary logo" value={draft.logoUrl} assets={assets} onChange={value => setValue('logoUrl', value)} hint="Replacing the selected media asset later preserves this placement."/><MediaSelect label="Favicon" value={draft.faviconUrl} assets={assets} onChange={value => setValue('faviconUrl', value)} hint="Use a square PNG or WEBP for best browser support."/><MediaSelect label="Default social sharing image" value={draft.defaultSocialImage} assets={assets} onChange={value => setValue('defaultSocialImage', value)} hint="Used when a page-specific Open Graph image is not set."/></div></section>}

        {tab === 'contact' && <section className="nk-settings-section"><header><Building2/><div><span>BUSINESS INFORMATION</span><h2>Contact, locations and opening hours</h2><p>The primary active entry feeds legacy placements; all active entries can appear on Contact.</p></div></header><div className="nk-settings-collection"><header><div><Phone/><span><b>Phone numbers</b><small>{draft.phones.length} configured</small></span></div><button onClick={() => setValue('phones', [...draft.phones, {id: id('phone'), label: 'New phone', number: '', active: true, primary: false}])}><Plus/>Add phone</button></header>{draft.phones.map((item, index) => <article key={item.id}><div className="nk-settings-row-handle"><Phone/><b>{item.label || 'Phone'}</b>{item.primary && <span>Primary</span>}</div><div className="nk-settings-fields"><Field label="Label"><input value={item.label} onChange={event => updateList('phones', index, {label: event.target.value})}/></Field><Field label="Number"><input type="tel" value={item.number} onChange={event => updateList('phones', index, {number: event.target.value})}/></Field></div><footer><label><input type="checkbox" checked={item.active} onChange={event => updateList('phones', index, {active: event.target.checked})}/>Active</label><ActionMenu compact placement="top" label={`Actions for ${item.label || 'phone'}`}><button role="menuitem" onClick={() => makePrimary('phones', index)} disabled={item.primary}>Make primary</button><button role="menuitem" className="danger" onClick={() => removeList('phones', index)} disabled={draft.phones.length === 1}><Trash2/>Remove</button></ActionMenu></footer></article>)}</div>
          <div className="nk-settings-collection"><header><div><Mail/><span><b>Email addresses</b><small>{draft.emails.length} configured</small></span></div><button onClick={() => setValue('emails', [...draft.emails, {id: id('email'), label: 'New email', address: '', active: true, primary: false}])}><Plus/>Add email</button></header>{draft.emails.map((item, index) => <article key={item.id}><div className="nk-settings-row-handle"><Mail/><b>{item.label || 'Email'}</b>{item.primary && <span>Primary</span>}</div><div className="nk-settings-fields"><Field label="Label"><input value={item.label} onChange={event => updateList('emails', index, {label: event.target.value})}/></Field><Field label="Email"><input type="email" value={item.address} onChange={event => updateList('emails', index, {address: event.target.value})}/></Field></div><footer><label><input type="checkbox" checked={item.active} onChange={event => updateList('emails', index, {active: event.target.checked})}/>Active</label><ActionMenu compact placement="top" label={`Actions for ${item.label || 'email'}`}><button role="menuitem" onClick={() => makePrimary('emails', index)} disabled={item.primary}>Make primary</button><button role="menuitem" className="danger" onClick={() => removeList('emails', index)} disabled={draft.emails.length === 1}><Trash2/>Remove</button></ActionMenu></footer></article>)}</div>
          <div className="nk-settings-collection"><header><div><MapPin/><span><b>Addresses and maps</b><small>{draft.locations.length} configured</small></span></div><button onClick={() => setValue('locations', [...draft.locations, {id: id('location'), label: 'New location', address: '', mapsUrl: 'https://maps.google.com/', active: true, primary: false}])}><Plus/>Add location</button></header>{draft.locations.map((item, index) => <article key={item.id}><div className="nk-settings-row-handle"><MapPin/><b>{item.label || 'Location'}</b>{item.primary && <span>Primary</span>}</div><div className="nk-settings-fields"><Field label="Label"><input value={item.label} onChange={event => updateList('locations', index, {label: event.target.value})}/></Field><Field label="Address"><textarea rows={2} value={item.address} onChange={event => updateList('locations', index, {address: event.target.value})}/></Field><Field label="Maps URL" wide><input type="url" value={item.mapsUrl} onChange={event => updateList('locations', index, {mapsUrl: event.target.value})}/></Field></div><footer><label><input type="checkbox" checked={item.active} onChange={event => updateList('locations', index, {active: event.target.checked})}/>Active</label><ActionMenu compact placement="top" label={`Actions for ${item.label || 'location'}`}><button role="menuitem" onClick={() => makePrimary('locations', index)} disabled={item.primary}>Make primary</button><button role="menuitem" className="danger" onClick={() => removeList('locations', index)} disabled={draft.locations.length === 1}><Trash2/>Remove</button></ActionMenu></footer></article>)}</div>
          <div className="nk-settings-collection"><header><div><Globe2/><span><b>Opening hours</b><small>{draft.openingHours.length} schedules</small></span></div><button onClick={() => setValue('openingHours', [...draft.openingHours, {id: id('hours'), label: 'New schedule', hours: '', active: true}])}><Plus/>Add schedule</button></header>{draft.openingHours.map((item, index) => <article key={item.id}><div className="nk-settings-row-handle"><Globe2/><b>{item.label || 'Schedule'}</b></div><div className="nk-settings-fields"><Field label="Label"><input value={item.label} onChange={event => updateList('openingHours', index, {label: event.target.value})}/></Field><Field label="Hours" wide><textarea rows={4} value={item.hours} onChange={event => updateList('openingHours', index, {hours: event.target.value})}/></Field></div><footer><label><input type="checkbox" checked={item.active} onChange={event => updateList('openingHours', index, {active: event.target.checked})}/>Active</label><ActionMenu compact placement="top" label={`Actions for ${item.label || 'opening hours'}`}><button role="menuitem" className="danger" onClick={() => removeList('openingHours', index)} disabled={draft.openingHours.length === 1}><Trash2/>Remove</button></ActionMenu></footer></article>)}</div><div className="nk-settings-fields"><Field label="Optional embedded map URL" hint="Use a privacy-safe HTTPS embed URL from your map provider." wide><input type="url" value={draft.mapEmbedUrl} onChange={event => setValue('mapEmbedUrl', event.target.value)}/></Field><Field label="Form enquiry recipient" wide><input type="email" value={draft.enquiryRecipient} onChange={event => setValue('enquiryRecipient', event.target.value)}/></Field></div></section>}

        {tab === 'social' && <section className="nk-settings-section"><header><Share2/><div><span>SOCIAL PRESENCE</span><h2>Social media links</h2><p>Add any platform, use a built-in or uploaded icon, drag to reorder, and choose exact placements.</p></div><button onClick={() => setValue('socialLinks', [...draft.socialLinks, {id: id('social'), platform: 'New platform', icon: 'globe', iconUrl: '', url: '', active: true, newTab: true, placements: ['footer']}])}><Plus/>Add platform</button></header><div className="nk-social-list">{draft.socialLinks.length ? draft.socialLinks.map((item, index) => <article onDragOver={(event: DragEvent) => {event.preventDefault(); event.dataTransfer.dropEffect = 'move';}} onDrop={(event: DragEvent<HTMLElement>) => dropSocial(event, item.id)} key={item.id}><button type="button" className="nk-social-handle" draggable onDragStart={(event: DragEvent<HTMLButtonElement>) => beginSocialDrag(event, item.id)} aria-label={`Drag ${item.platform}`}><GripVertical/><span>{index + 1}</span></button><div className="nk-social-icon">{item.iconUrl ? <img src={item.iconUrl} alt=""/> : <Globe2/>}</div><div className="nk-settings-fields"><Field label="Platform"><input value={item.platform} onChange={event => updateList('socialLinks', index, {platform: event.target.value})}/></Field><Field label="URL"><input type="url" required value={item.url} onChange={event => updateList('socialLinks', index, {url: event.target.value})}/></Field><Field label="Built-in icon"><select value={item.icon} onChange={event => updateList('socialLinks', index, {icon: event.target.value})}>{iconChoices.map(icon => <option key={icon}>{icon}</option>)}</select></Field><Field label="Custom icon"><div className="nk-social-upload"><input value={item.iconUrl} onChange={event => updateList('socialLinks', index, {iconUrl: event.target.value})} placeholder="Media URL or upload"/><label><Upload/>Upload<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => void uploadIcon(index, event)}/></label></div></Field><fieldset><legend>Display in</legend>{placementChoices.map(placement => <label key={placement}><input type="checkbox" checked={item.placements.includes(placement)} onChange={event => updateList('socialLinks', index, {placements: event.target.checked ? [...item.placements, placement] : item.placements.filter(value => value !== placement)})}/>{placement}</label>)}</fieldset></div><footer><label><input type="checkbox" checked={item.active} onChange={event => updateList('socialLinks', index, {active: event.target.checked})}/>Active</label><label><input type="checkbox" checked={item.newTab} onChange={event => updateList('socialLinks', index, {newTab: event.target.checked})}/>Open in new tab</label><span/><ActionMenu compact placement="top" label={`Actions for ${item.platform}`}><button role="menuitem" onClick={() => moveSocialBy(index, -1)} disabled={index === 0}><ArrowUp/>Move up</button><button role="menuitem" onClick={() => moveSocialBy(index, 1)} disabled={index === draft.socialLinks.length - 1}><ArrowDown/>Move down</button><button role="menuitem" className="danger" onClick={() => removeList('socialLinks', index)}><Trash2/>Delete</button></ActionMenu></footer></article>) : <div className="nk-social-empty"><Share2/><b>No social platforms yet</b><p>Add only the channels the business actively maintains.</p><button onClick={() => setValue('socialLinks', [{id: id('social'), platform: 'Instagram', icon: 'instagram', iconUrl: '', url: 'https://instagram.com/', active: true, newTab: true, placements: ['footer', 'contact']}])}><Plus/>Add first platform</button></div>}</div></section>}

        {tab === 'seo' && <section className="nk-settings-section"><header><Search/><div><span>SEARCH AND SHARING</span><h2>Global SEO defaults</h2><p>Route-specific SEO still overrides these values.</p></div></header><div className="nk-settings-fields"><Field label="Default page title" hint={`${draft.defaultMetaTitle.length}/70 characters`} wide><input maxLength={70} value={draft.defaultMetaTitle} onChange={event => setValue('defaultMetaTitle', event.target.value)}/></Field><Field label="Default meta description" hint={`${draft.defaultMetaDescription.length}/180 characters`} wide><textarea rows={4} maxLength={180} value={draft.defaultMetaDescription} onChange={event => setValue('defaultMetaDescription', event.target.value)}/></Field><Field label="HTML language"><input value={draft.language} onChange={event => setValue('language', event.target.value)}/></Field><Field label="Open Graph locale"><input value={draft.locale} onChange={event => setValue('locale', event.target.value)}/></Field><MediaSelect label="Default social sharing image" value={draft.defaultSocialImage} assets={assets} onChange={value => setValue('defaultSocialImage', value)}/></div><div className="nk-settings-seo-preview"><span>SEARCH PREVIEW</span><b>{draft.defaultMetaTitle || `${draft.siteName} | Electrical Services in Cyprus`}</b><a>https://nk-electrical.com/</a><p>{draft.defaultMetaDescription || 'Route-specific description or the built-in page description will appear here.'}</p></div></section>}

        {tab === 'layout' && <section className="nk-settings-section" data-guide="header-footer-settings"><header><LayoutTemplate/><div><span>GLOBAL LAYOUT</span><h2>Header and footer</h2><p>Control visibility, calls to action and global footer content.</p></div></header><div className="nk-settings-toggle-grid"><label><input type="checkbox" checked={draft.header.sticky} onChange={event => setValue('header', {...draft.header, sticky: event.target.checked})}/><span><b>Sticky header</b><small>Keep navigation visible while scrolling.</small></span></label><label><input type="checkbox" checked={draft.header.showTagline} onChange={event => setValue('header', {...draft.header, showTagline: event.target.checked})}/><span><b>Header tagline</b><small>Show the brand descriptor beside the logo.</small></span></label><label><input type="checkbox" checked={draft.header.showSocials} onChange={event => setValue('header', {...draft.header, showSocials: event.target.checked})}/><span><b>Header social links</b><small>Also requires the header placement per platform.</small></span></label><label><input type="checkbox" checked={draft.footer.showSocials} onChange={event => setValue('footer', {...draft.footer, showSocials: event.target.checked})}/><span><b>Footer social links</b><small>Show active footer social links.</small></span></label><label><input type="checkbox" checked={draft.footer.showContact} onChange={event => setValue('footer', {...draft.footer, showContact: event.target.checked})}/><span><b>Footer contact column</b><small>Show primary contact details.</small></span></label><label><input type="checkbox" checked={draft.footer.showHours} onChange={event => setValue('footer', {...draft.footer, showHours: event.target.checked})}/><span><b>Footer opening hours</b><small>Show the first active schedule.</small></span></label></div><div className="nk-settings-fields"><Field label="Header call-to-action label"><input value={draft.quoteLabel} onChange={event => setValue('quoteLabel', event.target.value)}/></Field><Field label="Header call-to-action URL"><input value={draft.quoteUrl} onChange={event => setValue('quoteUrl', event.target.value)}/></Field><Field label="Footer eyebrow"><input value={draft.footerEyebrow} onChange={event => setValue('footerEyebrow', event.target.value)}/></Field><Field label="Footer call-to-action label"><input value={draft.footerCtaLabel} onChange={event => setValue('footerCtaLabel', event.target.value)}/></Field><Field label="Footer headline" wide><textarea rows={3} value={draft.footerTitle} onChange={event => setValue('footerTitle', event.target.value)}/></Field><Field label="Copyright" wide><input value={draft.footerCopyright} onChange={event => setValue('footerCopyright', event.target.value)}/></Field></div></section>}
      </main>
      <section className="nk-settings-preview" aria-label={`${device} live preview`}><header><div><span>LIVE DRAFT</span><b>{previewPath}</b></div><a href={previewPath} target="_blank" rel="noreferrer">Open site <ExternalLink/></a></header><div style={{height: Math.round(780 * frameScale)}}><iframe ref={iframeRef} title="Website settings live preview" src={`${previewPath}${previewPath.includes('?') ? '&' : '?'}visualEditor=${encodeURIComponent(nonce.current)}`} style={{width: frameWidth, height: 780, transform: `scale(${frameScale})`}} onLoad={() => sendPreview()}/></div></section>
    </div>
  </div>;
}
