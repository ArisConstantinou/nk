import {useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent} from 'react';
import {ArchiveRestore, BookOpenCheck, Check, Copy, FileText, Folder, Image as ImageIcon, Link2, ListFilter, LoaderCircle, RefreshCw, Save, Search, Trash2, Upload, Video, X} from 'lucide-react';
import {createPortal} from 'react-dom';
import {useSearchParams} from 'react-router-dom';
import {adminApi, errorMessage} from '../api';
import {useAdminAuth} from '../auth/AdminAuth';
import {EmptyState, PageHeading} from '../components/AdminStates';
import {ActionMenu} from '../components/ActionMenu';
import {useAdminConfirm} from '../components/ConfirmDialog';
import {canManageMedia} from '../permissions';
import type {MediaAsset} from '../types';
import {publicAsset} from '../../utils/assets';

type MediaUsage = {source: string; id: string; kind: string; slug: string; title: string; state: string; path: string};
type UploadDefaults = {title: string; altText: string; caption: string; folder: string; category: string};
type WebsiteMediaIndex = {
  generatedAt: string;
  imageCount: number;
  images: Array<{id: string; path: string; filename: string; title: string; mimeType: string; size: number; width: number | null; height: number | null; folder: string; category: string; tags: string[]}>;
};
const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'application/pdf', 'video/mp4', 'video/webm'];
const mediaFamily = (mimeType: string) => mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('video/') ? 'video' : mimeType === 'application/pdf' ? 'document' : 'unknown';
const compatibleTypes = (mimeType: string) => acceptedTypes.filter(value => mediaFamily(value) === mediaFamily(mimeType));
const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {const reader = new FileReader(); reader.onerror = () => reject(new Error('The file could not be read.')); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.readAsDataURL(file);});
const titleFromFile = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());
const mediaTags = (item: MediaAsset) => String(item.metadata.tags || '').split(',').map(value => value.trim()).filter(Boolean);
const websiteMediaAssets = (index: WebsiteMediaIndex): MediaAsset[] => index.images.map((image, position) => ({
  id: image.id,
  filename: image.filename,
  mimeType: image.mimeType,
  size: image.size,
  altText: image.title,
  scope: 'site',
  caption: 'Image currently available on the public website.',
  title: image.title,
  folder: image.folder,
  category: image.category,
  metadata: {tags: image.tags.join(', ')},
  width: image.width,
  height: image.height,
  variants: [],
  replacementCount: 0,
  active: true,
  position: 1_000_000 + position,
  updatedAt: index.generatedAt,
  createdAt: index.generatedAt,
  url: publicAsset(image.path),
  origin: 'website',
}));

function AssetPreview({item}: {item: MediaAsset}) {
  if (item.mimeType.startsWith('image/')) return <img src={`${item.url}?v=${encodeURIComponent(item.updatedAt)}`} alt={item.altText} loading="lazy" decoding="async"/>;
  if (item.mimeType.startsWith('video/')) return <video src={item.url} muted preload="metadata"/>;
  return <FileText/>;
}

export function MediaPage() {
  const confirm = useAdminConfirm();
  const {user} = useAdminAuth();
  const canWrite = Boolean(user && canManageMedia(user.role));
  const canWriteItem = (item: MediaAsset) => Boolean(item.origin !== 'website' && user && (user.role === 'owner' || item.scope === ({editor: 'site', shop: 'shop', projects: 'projects'} as const)[user.role as 'editor' | 'shop' | 'projects']));
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const [usage, setUsage] = useState<MediaUsage[]>([]);
  const [usageLoading, setUsageLoading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [type, setType] = useState('all');
  const [folder, setFolder] = useState('all');
  const [category, setCategory] = useState('all');
  const [tag, setTag] = useState('all');
  const [controlsOpen, setControlsOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [topbarHost, setTopbarHost] = useState<HTMLElement | null>(null);
  const [params, setParams] = useSearchParams();
  const replaceInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [managed, website] = await Promise.all([
        adminApi<{media: MediaAsset[]}>('/media'),
        fetch(publicAsset('assets/website-media-index.json'), {cache: 'no-cache'}).then(async response => {
          if (!response.ok) throw new Error('Website image index is unavailable.');
          return response.json() as Promise<WebsiteMediaIndex>;
        }),
      ]);
      setItems([...managed.media.map(item => ({...item, origin: item.origin || 'managed' as const})), ...websiteMediaAssets(website)]);
    } catch (nextError) {setError(errorMessage(nextError));} finally {setLoading(false);}
  };
  useEffect(() => {void load();}, []);
  useEffect(() => {setTopbarHost(document.querySelector<HTMLElement>('.nk-admin-topbar-actions'));}, []);
  useEffect(() => {if (canWrite && params.get('upload') === '1') {setUploadOpen(true); const next = new URLSearchParams(params); next.delete('upload'); setParams(next, {replace: true});}}, [canWrite, params, setParams]);
  useEffect(() => {const assetId = params.get('asset'); if (assetId && items.length && selected?.id !== assetId) {const asset = items.find(item => item.id === assetId); if (asset) setSelected(asset);}}, [items, params, selected?.id]);
  useEffect(() => {if (!selected) {setUsage([]); return;} if (selected.origin === 'website') {setUsage([]); setUsageLoading(false); return;} setUsageLoading(true); adminApi<{usage: MediaUsage[]}>(`/media/${selected.id}/usage`).then(result => setUsage(result.usage)).catch(nextError => setError(errorMessage(nextError))).finally(() => setUsageLoading(false));}, [selected?.id, selected?.origin, selected?.updatedAt]);
  useEffect(() => {
    if (!uploadOpen && !selected && !controlsOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || busy) return;
      if (uploadOpen) {setUploadOpen(false); setUploadFiles([]);}
      else if (selected) setSelected(null);
      else setControlsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, controlsOpen, selected, uploadOpen]);

  const folders = useMemo(() => [...new Set(items.map(item => item.folder).filter(Boolean))].sort(), [items]);
  const categories = useMemo(() => [...new Set(items.map(item => item.category).filter(Boolean))].sort(), [items]);
  const tags = useMemo(() => [...new Set(items.filter(item => item.mimeType.startsWith('image/')).flatMap(mediaTags))].sort((a, b) => a.localeCompare(b)), [items]);
  const shown = useMemo(() => items.filter(item => {
    const haystack = `${item.filename} ${item.title} ${item.altText} ${item.caption} ${item.folder} ${item.category} ${item.metadata.tags || ''} ${item.mimeType}`.toLowerCase();
    return (status === 'all' || (status === 'active') === item.active) && (type === 'all' || item.mimeType.startsWith(`${type}/`) || (type === 'document' && item.mimeType === 'application/pdf')) && (folder === 'all' || item.folder === folder) && (category === 'all' || item.category === category) && (tag === 'all' || mediaTags(item).includes(tag)) && (!query || haystack.includes(query.toLowerCase()));
  }).sort((a, b) => a.category.localeCompare(b.category) || (a.title || a.filename).localeCompare(b.title || b.filename)), [category, folder, items, query, status, tag, type]);
  const shownGroups = useMemo(() => {
    const groups = new Map<string, MediaAsset[]>();
    shown.forEach(item => {
      const group = tag === 'all' ? item.category || mediaTags(item)[0] || 'Uncategorised' : tag;
      groups.set(group, [...(groups.get(group) || []), item]);
    });
    return [...groups].map(([label, assets]) => ({label, assets}));
  }, [shown, tag]);
  const activeControlCount = [type !== 'all', folder !== 'all', category !== 'all', status !== 'all', tag !== 'all', Boolean(query)].filter(Boolean).length;
  const resetControls = () => {setType('all'); setFolder('all'); setCategory('all'); setStatus('all'); setTag('all'); setQuery('');};

  const chooseFiles = (files: FileList | File[]) => {
    const next = [...files].filter(file => acceptedTypes.includes(file.type) && file.size > 0 && file.size <= 25 * 1024 * 1024);
    if (!next.length) {setError('Choose JPG, PNG, WEBP, SVG, PDF, MP4 or WEBM files up to 25 MB.'); return;}
    setUploadFiles(next); setError(''); setUploadOpen(true);
  };
  const onDrop = (event: DragEvent) => {event.preventDefault(); setDragActive(false); if (canWrite) chooseFiles(event.dataTransfer.files);};
  const upload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!uploadFiles.length) {setError('Choose at least one file to upload.'); return;}
    setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    const defaults: UploadDefaults = {title: String(data.get('title') || ''), altText: String(data.get('altText') || ''), caption: String(data.get('caption') || ''), folder: String(data.get('folder') || 'General'), category: String(data.get('category') || 'Uncategorised')};
    const created: MediaAsset[] = [];
    try {
      for (const [index, file] of uploadFiles.entries()) {
        setUploadProgress(`Optimizing and uploading ${index + 1} of ${uploadFiles.length}: ${file.name}`);
        const generatedTitle = titleFromFile(file.name);
        const base64 = await fileToBase64(file);
        const result = await adminApi<{media: MediaAsset}>('/media', {method: 'POST', body: JSON.stringify({filename: file.name, mimeType: file.type, base64, title: uploadFiles.length === 1 && defaults.title ? defaults.title : generatedTitle, altText: file.type.startsWith('image/') ? (uploadFiles.length === 1 && defaults.altText ? defaults.altText : generatedTitle) : defaults.altText, caption: defaults.caption, folder: defaults.folder, category: defaults.category, metadata: {tags: String(data.get('tags') || '')}})});
        created.push(result.media);
      }
      setItems(current => [...current, ...created]); setUploadFiles([]); setUploadOpen(false); setNotice(`${created.length} Gallery item${created.length === 1 ? '' : 's'} uploaded, optimized and activated.`);
    } catch (nextError) {setError(`${created.length ? `${created.length} file(s) were uploaded before the error. ` : ''}${errorMessage(nextError)}`); if (created.length) setItems(current => [...current, ...created]);}
    finally {setBusy(false); setUploadProgress('');}
  };
  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selected) return; setBusy(true); setError(''); const data = new FormData(event.currentTarget);
    try {
      const result = await adminApi<{media: MediaAsset}>(`/media/${selected.id}`, {method: 'PATCH', body: JSON.stringify({filename: data.get('filename'), title: data.get('title'), altText: data.get('altText'), caption: data.get('caption'), folder: data.get('folder'), category: data.get('category'), active: data.get('active') === 'on', metadata: {credit: data.get('credit'), copyright: data.get('copyright'), license: data.get('license'), tags: data.get('tags')}})});
      setItems(current => current.map(item => item.id === result.media.id ? result.media : item)); setSelected(result.media); setNotice('Media metadata saved.');
    } catch (nextError) {setError(errorMessage(nextError));} finally {setBusy(false);}
  };
  const replace = async (file?: File) => {
    if (!selected || !file?.size) return;
    if (!acceptedTypes.includes(file.type) || file.size > 25 * 1024 * 1024) {setError('Choose a supported replacement up to 25 MB.'); return;}
    if (mediaFamily(file.type) !== mediaFamily(selected.mimeType)) {setError('Choose the same media family so existing website layouts remain valid.'); return;}
    setBusy(true); setError(''); setUploadProgress(`Optimizing replacement: ${file.name}`);
    try {
      const base64 = await fileToBase64(file);
      const result = await adminApi<{media: MediaAsset}>(`/media/${selected.id}/replace`, {method: 'POST', body: JSON.stringify({filename: file.name, mimeType: file.type, base64})});
      setItems(current => current.map(item => item.id === result.media.id ? result.media : item)); setSelected(result.media); setNotice('File replaced. Its public URL and every existing placement were preserved.');
    } catch (nextError) {setError(errorMessage(nextError));} finally {setBusy(false); setUploadProgress(''); if (replaceInput.current) replaceInput.current.value = '';}
  };
  const duplicate = async (item: MediaAsset) => {setBusy(true); setError(''); try {const result = await adminApi<{media: MediaAsset}>(`/media/${item.id}/duplicate`, {method: 'POST'}); setItems(current => [...current, result.media]); setSelected(result.media); setNotice('Inactive media copy created.');} catch (nextError) {setError(errorMessage(nextError));} finally {setBusy(false);}};
  const remove = async (item: MediaAsset) => {if (!await confirm({title:`Permanently delete “${item.filename}”?`,description:'The original media file and every optimized stored variant will be removed.',detail:'This action cannot be undone and is available only for unused media.',confirmLabel:'Delete media',cancelLabel:'Keep media',tone:'danger'})) return; setBusy(true); setError(''); try {await adminApi(`/media/${item.id}`, {method: 'DELETE'}); setItems(current => current.filter(value => value.id !== item.id)); if (selected?.id === item.id) setSelected(null); setNotice('Unused media asset permanently deleted.');} catch (nextError) {setError(errorMessage(nextError));} finally {setBusy(false);}};
  const copyUrl = async (item: MediaAsset) => {try {await navigator.clipboard.writeText(new URL(item.url, window.location.origin).href); setNotice('Public media URL copied.');} catch {setError('The browser could not copy the URL. Select it from the media details instead.');}};

  return <div className="nk-admin-media-page" onDragEnter={event => {if (canWrite && event.dataTransfer.types.includes('Files')) setDragActive(true);}} onDragOver={event => {if (canWrite) event.preventDefault();}} onDrop={onDrop}>
    {topbarHost && createPortal(<><button className="nk-admin-gallery-top-action nk-admin-gallery-top-action--help" type="button" onClick={() => window.dispatchEvent(new Event('nk-admin:gallery-help'))} aria-label="Open Gallery help" title="Gallery help"><BookOpenCheck/><span>Help</span></button>{canWrite && <button className="nk-admin-gallery-top-action nk-admin-gallery-top-action--upload" type="button" onClick={() => setUploadOpen(true)} aria-label="Upload files" title="Upload files"><Upload/><span>Upload</span></button>}<button className="nk-admin-gallery-top-action nk-admin-gallery-top-action--filters" type="button" onClick={() => setControlsOpen(true)} aria-label="Browse and filter Gallery" title="Browse and filter Gallery"><ListFilter/><span>Filters</span>{activeControlCount > 0 && <b>{activeControlCount}</b>}</button></>, topbarHost)}
    <PageHeading eyebrow="MEDIA GALLERY" title="Gallery" description="Browse, upload and reuse all website photos, videos, PDFs and catalogue files in one place."/>
    {error && <p className="nk-admin-alert nk-admin-alert--error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X/></button></p>}
    {notice && <p className="nk-admin-alert" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message"><X/></button></p>}
    {dragActive && <div className="nk-admin-drop-overlay" onDragLeave={() => setDragActive(false)}><Upload/><b>Drop files to add them to Gallery</b><span>They remain unpublished until the validated upload completes.</span></div>}
    {controlsOpen && <div className="nk-admin-media-controls-backdrop" onMouseDown={event => {if (event.target === event.currentTarget) setControlsOpen(false);}}><aside className="nk-admin-media-controls" id="gallery-browse-panel" role="dialog" aria-modal="true" aria-label="Browse and filter Gallery"><header><div><small>GALLERY TOOLS</small><h2>Browse & filters</h2></div><button type="button" onClick={() => setControlsOpen(false)} aria-label="Close Gallery filters"><X/></button></header><div className="nk-admin-media-controls-body"><section><span>MEDIA TYPE</span><div className="nk-admin-gallery-types" role="group" aria-label="Choose Gallery content type"><button type="button" className={type === 'all' ? 'active' : ''} onClick={() => setType('all')}>All</button><button type="button" className={type === 'image' ? 'active' : ''} onClick={() => setType('image')}><ImageIcon/>Photos</button><button type="button" className={type === 'video' ? 'active' : ''} onClick={() => {setType('video'); setTag('all');}}><Video/>Videos</button><button type="button" className={type === 'document' ? 'active' : ''} onClick={() => {setType('document'); setTag('all');}}><FileText/>PDFs</button></div></section><section><span>FIND MEDIA</span><label className="nk-admin-media-control-search"><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search Gallery" aria-label="Search Gallery"/></label><div className="nk-admin-media-control-selects"><select value={folder} onChange={event => setFolder(event.target.value)} aria-label="Filter Gallery folder"><option value="all">All folders</option>{folders.map(value => <option key={value}>{value}</option>)}</select><select value={category} onChange={event => setCategory(event.target.value)} aria-label="Filter Gallery category"><option value="all">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select><select value={status} onChange={event => setStatus(event.target.value as typeof status)} aria-label="Filter Gallery status"><option value="all">All states</option><option value="active">Active</option><option value="inactive">Inactive</option></select></div></section>{(type === 'all' || type === 'image') && <section><span>PHOTO TAGS</span><div className="nk-admin-media-tags" role="group" aria-label="Organise Photos by tag"><button type="button" className={tag === 'all' ? 'active' : ''} onClick={() => setTag('all')}>All photos</button>{tags.map(value => <button type="button" className={tag === value ? 'active' : ''} onClick={() => setTag(value)} key={value}>{value}</button>)}</div></section>}</div><footer><button type="button" onClick={resetControls} disabled={!activeControlCount}>Clear all</button><span>{shown.length} of {items.length}</span><button className="nk-admin-primary" type="button" onClick={() => setControlsOpen(false)}>Show media</button></footer></aside></div>}
    {loading
      ? <div className="nk-admin-list-loading"><RefreshCw className="nk-admin-spin"/>Loading Gallery…</div>
      : shown.length
        ? <div className="nk-admin-media-groups">{shownGroups.map(group => <section key={group.label}><header><div><span>PHOTO TAG</span><h2>{group.label}</h2></div><b>{group.assets.length}</b></header><div className="nk-admin-media-grid">{group.assets.map(item => <article className={!item.active ? 'inactive' : ''} key={item.id}><button className="nk-admin-media-preview" onClick={() => setSelected(item)}><AssetPreview item={item}/></button><span><Folder/> {item.folder} / {item.category}</span><b>{item.title || item.filename}</b><p>{item.caption || item.altText || item.filename}</p><footer><small>{item.origin === 'website' ? 'WEBSITE' : 'UPLOADED'} · {(item.size / 1024 / 1024).toFixed(item.size > 1024 * 1024 ? 1 : 2)} MB{item.width ? ` · ${item.width}×${item.height}` : ''}</small><ActionMenu compact placement="top" label={`Actions for ${item.filename}`}><button role="menuitem" onClick={() => void copyUrl(item)}><Link2/>Copy URL</button>{canWriteItem(item) && <button role="menuitem" onClick={() => void duplicate(item)} disabled={busy}><Copy/>Duplicate</button>}{user?.role === 'owner' && item.origin !== 'website' && <button role="menuitem" className="danger" onClick={() => void remove(item)} disabled={busy}><Trash2/>Delete</button>}</ActionMenu></footer></article>)}</div></section>)}</div>
        : <EmptyState title="No Gallery items found" body={query || status !== 'all' || type !== 'all' || folder !== 'all' || category !== 'all' || tag !== 'all' ? 'Change or clear the filters to see more items.' : canWrite ? 'Drop files here or upload the first Gallery item.' : 'No shared Gallery files have been uploaded.'}/>}

    {uploadOpen && <div className="nk-admin-editor-backdrop"><section className="nk-admin-editor nk-admin-editor--compact" role="dialog" aria-modal="true" aria-label="Upload files to Gallery"><header><div><span>GALLERY UPLOAD</span><h2>Upload files</h2></div><button onClick={() => {if (!busy) {setUploadOpen(false); setUploadFiles([]);}}} aria-label="Close upload form"><X/></button></header><form onSubmit={upload}><label className={`nk-admin-upload-zone ${dragActive ? 'active' : ''}`} onDragOver={event => event.preventDefault()} onDrop={onDrop}><Upload/><b>{uploadFiles.length ? `${uploadFiles.length} file${uploadFiles.length === 1 ? '' : 's'} ready` : 'Drop files here or browse'}</b><small>Photos, videos and PDF catalogues · JPG, PNG, WEBP, SVG, PDF, MP4 or WEBM · 25 MB each</small><input type="file" accept={acceptedTypes.join(',')} multiple onChange={event => event.target.files && chooseFiles(event.target.files)} autoFocus={!uploadFiles.length}/>{uploadFiles.length > 0 && <ul>{uploadFiles.map(file => <li key={`${file.name}-${file.size}`}><Check/>{file.name}<span>{(file.size / 1024 / 1024).toFixed(2)} MB</span></li>)}</ul>}</label><div className="nk-admin-editor-fields"><label>Title<input name="title" maxLength={240} placeholder={uploadFiles.length > 1 ? 'Generated from each filename' : 'Gallery item title'}/></label><label>Alternative text<input name="altText" maxLength={300} placeholder={uploadFiles.length > 1 ? 'Generated from each image filename' : 'Describe the image'}/><small>Generated safely for batch uploads and editable later.</small></label><label>Folder<input name="folder" list="media-folders" defaultValue={folder === 'all' ? 'General' : folder} maxLength={100}/></label><label>Category<input name="category" list="media-categories" defaultValue={category === 'all' ? 'Uncategorised' : category} maxLength={100}/></label><label>Tags<input name="tags" maxLength={600} placeholder="lighting, showroom, project"/></label><label>Caption<textarea name="caption" rows={3} maxLength={1000}/></label></div><datalist id="media-folders">{folders.map(value => <option key={value} value={value}/>)}</datalist><datalist id="media-categories">{categories.map(value => <option key={value} value={value}/>)}</datalist>{uploadProgress && <p className="nk-admin-upload-progress"><LoaderCircle className="nk-admin-spin"/>{uploadProgress}</p>}<footer><button className="nk-admin-primary" disabled={busy || !uploadFiles.length}>{busy ? <RefreshCw className="nk-admin-spin"/> : <ImageIcon/>}{busy ? 'Processing…' : `Upload ${uploadFiles.length || ''} file${uploadFiles.length === 1 ? '' : 's'}`}</button></footer></form></section></div>}

    {selected && <div className="nk-admin-editor-backdrop"><section className="nk-admin-editor nk-admin-media-editor" role="dialog" aria-modal="true" aria-label={`${canWriteItem(selected) ? 'Edit' : 'View'} ${selected.filename}`}><header><div>{selected.mimeType.startsWith('video/') ? <Video/> : selected.mimeType.startsWith('image/') ? <ImageIcon/> : <FileText/>}<span>{selected.origin === 'website' ? 'WEBSITE MEDIA' : canWriteItem(selected) ? 'MEDIA DETAILS' : 'READ-ONLY MEDIA'}</span><h2>{selected.title || selected.filename}</h2></div><button onClick={() => setSelected(null)} aria-label="Close media details"><X/></button></header><div className="nk-admin-media-editor-layout"><div><div className="nk-admin-media-editor-preview"><AssetPreview item={selected}/></div><dl className="nk-admin-media-tech"><div><dt>Source</dt><dd>{selected.origin === 'website' ? 'Public website image' : 'Gallery upload'}</dd></div><div><dt>Public URL</dt><dd>{selected.url}</dd></div><div><dt>File</dt><dd>{selected.mimeType} · {(selected.size / 1024 / 1024).toFixed(2)} MB</dd></div>{selected.width && <div><dt>Dimensions</dt><dd>{selected.width} × {selected.height}px</dd></div>}<div><dt>Responsive</dt><dd>{selected.variants.length ? selected.variants.map(value => `${value.width}px WebP`).join(', ') : 'Original size is already compact'}</dd></div><div><dt>Replacements</dt><dd>{selected.replacementCount}</dd></div></dl>{canWriteItem(selected) && <div className="nk-admin-replace-box"><ArchiveRestore/><div><b>Replace without breaking the layout</b><p>The asset ID, media family and public URL stay unchanged everywhere.</p></div><button type="button" disabled={busy} onClick={() => replaceInput.current?.click()}>Choose replacement</button><input ref={replaceInput} hidden type="file" accept={compatibleTypes(selected.mimeType).join(',')} onChange={event => void replace(event.target.files?.[0])}/></div>}</div><form onSubmit={save}><div className="nk-admin-editor-fields"><label>Filename<input name="filename" required disabled={!canWriteItem(selected)} defaultValue={selected.filename}/></label><label>Title<input name="title" disabled={!canWriteItem(selected)} defaultValue={selected.title}/></label><label>Alternative text<input name="altText" required={selected.mimeType.startsWith('image/')} disabled={!canWriteItem(selected)} defaultValue={selected.altText}/></label><label>Caption<textarea name="caption" rows={3} disabled={!canWriteItem(selected)} defaultValue={selected.caption}/></label><label>Folder<input name="folder" list="media-folders" disabled={!canWriteItem(selected)} defaultValue={selected.folder}/></label><label>Category<input name="category" list="media-categories" disabled={!canWriteItem(selected)} defaultValue={selected.category}/></label><label>Credit<input name="credit" disabled={!canWriteItem(selected)} defaultValue={selected.metadata.credit || ''}/></label><label>Copyright<input name="copyright" disabled={!canWriteItem(selected)} defaultValue={selected.metadata.copyright || ''}/></label><label>License<input name="license" disabled={!canWriteItem(selected)} defaultValue={selected.metadata.license || ''}/></label><label>Tags<input name="tags" disabled={!canWriteItem(selected)} defaultValue={selected.metadata.tags || ''}/></label><label className="nk-admin-checkbox"><input name="active" type="checkbox" disabled={!canWriteItem(selected)} defaultChecked={selected.active}/><span>Active and publicly accessible</span></label><label>Workspace<input readOnly value={selected.scope}/></label></div><section className="nk-admin-usage"><header><b>Website usage</b><span>{selected.origin === 'website' ? 'Built in' : usageLoading ? 'Checking…' : `${usage.length} placement${usage.length === 1 ? '' : 's'}`}</span></header>{selected.origin === 'website' ? <p><Check/>This image is indexed directly from the public website.</p> : usageLoading ? <p><LoaderCircle className="nk-admin-spin"/>Scanning drafts and published content…</p> : usage.length ? <ul>{usage.map((entry, index) => <li key={`${entry.id}-${entry.state}-${entry.path}-${index}`}><span>{entry.kind} · {entry.state}</span><b>{entry.title}</b><small>{entry.path}</small></li>)}</ul> : <p><Check/>This asset is not referenced by website content.</p>}</section>{uploadProgress && <p className="nk-admin-upload-progress"><LoaderCircle className="nk-admin-spin"/>{uploadProgress}</p>}{canWriteItem(selected) && <footer><button className="nk-admin-primary" disabled={busy}><Save/>{busy ? 'Saving…' : 'Save metadata'}</button><ActionMenu placement="top" label={`More actions for ${selected.filename}`}><button type="button" role="menuitem" onClick={() => void copyUrl(selected)}><Link2/>Copy URL</button><button type="button" role="menuitem" onClick={() => void duplicate(selected)} disabled={busy}><Copy/>Duplicate</button>{user?.role === 'owner' && <button type="button" role="menuitem" className="danger" onClick={() => void remove(selected)} disabled={busy || usage.length > 0}><Trash2/>{usage.length ? 'Used by website' : 'Delete permanently'}</button>}</ActionMenu></footer>}</form></div></section></div>}
  </div>;
}
