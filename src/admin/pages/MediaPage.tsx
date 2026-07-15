import {useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent} from 'react';
import {ArchiveRestore, Check, Copy, FileText, Folder, Image as ImageIcon, Link2, LoaderCircle, Plus, RefreshCw, Save, Search, Trash2, Upload, Video, X} from 'lucide-react';
import {useSearchParams} from 'react-router-dom';
import {adminApi, errorMessage} from '../api';
import {useAdminAuth} from '../auth/AdminAuth';
import {EmptyState, PageHeading} from '../components/AdminStates';
import {canManageMedia} from '../permissions';
import type {MediaAsset} from '../types';

type MediaUsage = {source: string; id: string; kind: string; slug: string; title: string; state: string; path: string};
type UploadDefaults = {title: string; altText: string; caption: string; folder: string; category: string};
const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4', 'video/webm'];
const mediaFamily = (mimeType: string) => mimeType.startsWith('image/') ? 'image' : mimeType.startsWith('video/') ? 'video' : mimeType === 'application/pdf' ? 'document' : 'unknown';
const compatibleTypes = (mimeType: string) => acceptedTypes.filter(value => mediaFamily(value) === mediaFamily(mimeType));
const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {const reader = new FileReader(); reader.onerror = () => reject(new Error('The file could not be read.')); reader.onload = () => resolve(String(reader.result).split(',')[1] || ''); reader.readAsDataURL(file);});
const titleFromFile = (name: string) => name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase());

function AssetPreview({item}: {item: MediaAsset}) {
  if (item.mimeType.startsWith('image/')) return <img src={`${item.url}?v=${encodeURIComponent(item.updatedAt)}`} alt={item.altText}/>;
  if (item.mimeType.startsWith('video/')) return <video src={item.url} muted preload="metadata"/>;
  return <FileText/>;
}

export function MediaPage() {
  const {user} = useAdminAuth();
  const canWrite = Boolean(user && canManageMedia(user.role));
  const canWriteItem = (item: MediaAsset) => Boolean(user && (user.role === 'owner' || item.scope === ({editor: 'site', shop: 'shop', projects: 'projects'} as const)[user.role as 'editor' | 'shop' | 'projects']));
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
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useSearchParams();
  const replaceInput = useRef<HTMLInputElement>(null);

  const load = async () => {setLoading(true); setError(''); try {setItems((await adminApi<{media: MediaAsset[]}>('/media')).media);} catch (nextError) {setError(errorMessage(nextError));} finally {setLoading(false);}};
  useEffect(() => {void load();}, []);
  useEffect(() => {if (canWrite && params.get('upload') === '1') {setUploadOpen(true); const next = new URLSearchParams(params); next.delete('upload'); setParams(next, {replace: true});}}, [canWrite, params, setParams]);
  useEffect(() => {const assetId = params.get('asset'); if (assetId && items.length && selected?.id !== assetId) {const asset = items.find(item => item.id === assetId); if (asset) setSelected(asset);}}, [items, params, selected?.id]);
  useEffect(() => {if (!selected) {setUsage([]); return;} setUsageLoading(true); adminApi<{usage: MediaUsage[]}>(`/media/${selected.id}/usage`).then(result => setUsage(result.usage)).catch(nextError => setError(errorMessage(nextError))).finally(() => setUsageLoading(false));}, [selected?.id, selected?.updatedAt]);
  useEffect(() => {
    if (!uploadOpen && !selected) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || busy) return;
      if (uploadOpen) {setUploadOpen(false); setUploadFiles([]);}
      else setSelected(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, selected, uploadOpen]);

  const folders = useMemo(() => [...new Set(items.map(item => item.folder).filter(Boolean))].sort(), [items]);
  const categories = useMemo(() => [...new Set(items.map(item => item.category).filter(Boolean))].sort(), [items]);
  const shown = useMemo(() => items.filter(item => {
    const haystack = `${item.filename} ${item.title} ${item.altText} ${item.caption} ${item.folder} ${item.category} ${item.metadata.tags || ''} ${item.mimeType}`.toLowerCase();
    return (status === 'all' || (status === 'active') === item.active) && (type === 'all' || item.mimeType.startsWith(`${type}/`) || (type === 'document' && item.mimeType === 'application/pdf')) && (folder === 'all' || item.folder === folder) && (category === 'all' || item.category === category) && (!query || haystack.includes(query.toLowerCase()));
  }).sort((a, b) => a.position - b.position), [category, folder, items, query, status, type]);

  const chooseFiles = (files: FileList | File[]) => {
    const next = [...files].filter(file => acceptedTypes.includes(file.type) && file.size > 0 && file.size <= 25 * 1024 * 1024);
    if (!next.length) {setError('Choose JPG, PNG, WEBP, PDF, MP4 or WEBM files up to 25 MB.'); return;}
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
      setItems(current => [...current, ...created]); setUploadFiles([]); setUploadOpen(false); setNotice(`${created.length} asset${created.length === 1 ? '' : 's'} uploaded, optimized and activated.`);
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
  const remove = async (item: MediaAsset) => {if (!window.confirm(`Permanently delete “${item.filename}” and its stored variants?`)) return; setBusy(true); setError(''); try {await adminApi(`/media/${item.id}`, {method: 'DELETE'}); setItems(current => current.filter(value => value.id !== item.id)); if (selected?.id === item.id) setSelected(null); setNotice('Unused media asset permanently deleted.');} catch (nextError) {setError(errorMessage(nextError));} finally {setBusy(false);}};
  const copyUrl = async (item: MediaAsset) => {try {await navigator.clipboard.writeText(new URL(item.url, window.location.origin).href); setNotice('Public media URL copied.');} catch {setError('The browser could not copy the URL. Select it from the media details instead.');}};

  return <div className="nk-admin-media-page" onDragEnter={event => {if (canWrite && event.dataTransfer.types.includes('Files')) setDragActive(true);}} onDragOver={event => {if (canWrite) event.preventDefault();}} onDrop={onDrop}>
    <PageHeading eyebrow="ASSETS / CONTROLLED LIBRARY" title="Media library" description="Upload, organize, optimize, replace and trace every file used by the website." actions={canWrite ? <button className="nk-admin-primary" onClick={() => setUploadOpen(true)}><Plus/>Upload assets</button> : undefined}/>
    {error && <p className="nk-admin-alert nk-admin-alert--error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error"><X/></button></p>}
    {notice && <p className="nk-admin-alert" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Dismiss message"><X/></button></p>}
    {dragActive && <div className="nk-admin-drop-overlay" onDragLeave={() => setDragActive(false)}><Upload/><b>Drop files to add them to the library</b><span>They remain unpublished until the validated upload completes.</span></div>}
    <div className="nk-admin-media-toolbar nk-admin-media-toolbar--full"><label><Search/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search filename, tags, folder…" aria-label="Search media"/></label><select value={type} onChange={event => setType(event.target.value)} aria-label="Filter media type"><option value="all">All types</option><option value="image">Images</option><option value="video">Videos</option><option value="document">PDFs</option></select><select value={folder} onChange={event => setFolder(event.target.value)} aria-label="Filter media folder"><option value="all">All folders</option>{folders.map(value => <option key={value}>{value}</option>)}</select><select value={category} onChange={event => setCategory(event.target.value)} aria-label="Filter media category"><option value="all">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select><select value={status} onChange={event => setStatus(event.target.value as typeof status)} aria-label="Filter media status"><option value="all">All states</option><option value="active">Active</option><option value="inactive">Inactive</option></select><span>{shown.length} of {items.length}</span></div>
    {loading ? <div className="nk-admin-list-loading"><RefreshCw className="nk-admin-spin"/>Loading media library…</div> : shown.length ? <div className="nk-admin-media-grid">{shown.map(item => <article className={!item.active ? 'inactive' : ''} key={item.id}><button className="nk-admin-media-preview" onClick={() => setSelected(item)}><AssetPreview item={item}/></button><span><Folder/> {item.folder} / {item.category}</span><b>{item.title || item.filename}</b><p>{item.caption || item.altText || item.filename}</p><footer><small>{(item.size / 1024 / 1024).toFixed(item.size > 1024 * 1024 ? 1 : 2)} MB{item.width ? ` · ${item.width}×${item.height}` : ''} · {item.variants.length} variants</small><div><button onClick={() => void copyUrl(item)} aria-label={`Copy URL for ${item.filename}`}><Link2/></button>{canWriteItem(item) && <button onClick={() => void duplicate(item)} disabled={busy} aria-label={`Duplicate ${item.filename}`}><Copy/></button>}{user?.role === 'owner' && <button className="danger" onClick={() => void remove(item)} disabled={busy} aria-label={`Delete ${item.filename}`}><Trash2/></button>}</div></footer></article>)}</div> : <EmptyState title="No media assets found" body={query || status !== 'all' || type !== 'all' || folder !== 'all' || category !== 'all' ? 'Change or clear the filters to see more assets.' : canWrite ? 'Drop files here or upload the first asset.' : 'No shared media has been uploaded.'}/>}

    {uploadOpen && <div className="nk-admin-editor-backdrop"><section className="nk-admin-editor nk-admin-editor--compact" role="dialog" aria-modal="true" aria-label="Upload media assets"><header><div><span>OPTIMIZED UPLOAD</span><h2>Add media assets</h2></div><button onClick={() => {if (!busy) {setUploadOpen(false); setUploadFiles([]);}}} aria-label="Close upload form"><X/></button></header><form onSubmit={upload}><label className={`nk-admin-upload-zone ${dragActive ? 'active' : ''}`} onDragOver={event => event.preventDefault()} onDrop={onDrop}><Upload/><b>{uploadFiles.length ? `${uploadFiles.length} file${uploadFiles.length === 1 ? '' : 's'} ready` : 'Drop files here or browse'}</b><small>JPG, PNG, WEBP, PDF, MP4 or WEBM · 25 MB each</small><input type="file" accept={acceptedTypes.join(',')} multiple onChange={event => event.target.files && chooseFiles(event.target.files)} autoFocus={!uploadFiles.length}/>{uploadFiles.length > 0 && <ul>{uploadFiles.map(file => <li key={`${file.name}-${file.size}`}><Check/>{file.name}<span>{(file.size / 1024 / 1024).toFixed(2)} MB</span></li>)}</ul>}</label><div className="nk-admin-editor-fields"><label>Title<input name="title" maxLength={240} placeholder={uploadFiles.length > 1 ? 'Generated from each filename' : 'Asset title'}/></label><label>Alternative text<input name="altText" maxLength={300} placeholder={uploadFiles.length > 1 ? 'Generated from each image filename' : 'Describe the image'}/><small>Generated safely for batch uploads and editable later.</small></label><label>Folder<input name="folder" list="media-folders" defaultValue={folder === 'all' ? 'General' : folder} maxLength={100}/></label><label>Category<input name="category" list="media-categories" defaultValue={category === 'all' ? 'Uncategorised' : category} maxLength={100}/></label><label>Tags<input name="tags" maxLength={600} placeholder="lighting, showroom, project"/></label><label>Caption<textarea name="caption" rows={3} maxLength={1000}/></label></div><datalist id="media-folders">{folders.map(value => <option key={value} value={value}/>)}</datalist><datalist id="media-categories">{categories.map(value => <option key={value} value={value}/>)}</datalist>{uploadProgress && <p className="nk-admin-upload-progress"><LoaderCircle className="nk-admin-spin"/>{uploadProgress}</p>}<footer><button className="nk-admin-primary" disabled={busy || !uploadFiles.length}>{busy ? <RefreshCw className="nk-admin-spin"/> : <ImageIcon/>}{busy ? 'Processing…' : `Upload ${uploadFiles.length || ''} asset${uploadFiles.length === 1 ? '' : 's'}`}</button></footer></form></section></div>}

    {selected && <div className="nk-admin-editor-backdrop"><section className="nk-admin-editor nk-admin-media-editor" role="dialog" aria-modal="true" aria-label={`${canWriteItem(selected) ? 'Edit' : 'View'} ${selected.filename}`}><header><div>{selected.mimeType.startsWith('video/') ? <Video/> : selected.mimeType.startsWith('image/') ? <ImageIcon/> : <FileText/>}<span>{canWriteItem(selected) ? 'MEDIA DETAILS' : 'READ-ONLY MEDIA'}</span><h2>{selected.title || selected.filename}</h2></div><button onClick={() => setSelected(null)} aria-label="Close media details"><X/></button></header><div className="nk-admin-media-editor-layout"><div><div className="nk-admin-media-editor-preview"><AssetPreview item={selected}/></div><dl className="nk-admin-media-tech"><div><dt>Public URL</dt><dd>{selected.url}</dd></div><div><dt>File</dt><dd>{selected.mimeType} · {(selected.size / 1024 / 1024).toFixed(2)} MB</dd></div>{selected.width && <div><dt>Dimensions</dt><dd>{selected.width} × {selected.height}px</dd></div>}<div><dt>Responsive</dt><dd>{selected.variants.length ? selected.variants.map(value => `${value.width}px WebP`).join(', ') : 'Original size is already compact'}</dd></div><div><dt>Replacements</dt><dd>{selected.replacementCount}</dd></div></dl>{canWriteItem(selected) && <div className="nk-admin-replace-box"><ArchiveRestore/><div><b>Replace without breaking the layout</b><p>The asset ID, media family and public URL stay unchanged everywhere.</p></div><button type="button" disabled={busy} onClick={() => replaceInput.current?.click()}>Choose replacement</button><input ref={replaceInput} hidden type="file" accept={compatibleTypes(selected.mimeType).join(',')} onChange={event => void replace(event.target.files?.[0])}/></div>}</div><form onSubmit={save}><div className="nk-admin-editor-fields"><label>Filename<input name="filename" required disabled={!canWriteItem(selected)} defaultValue={selected.filename}/></label><label>Title<input name="title" disabled={!canWriteItem(selected)} defaultValue={selected.title}/></label><label>Alternative text<input name="altText" required={selected.mimeType.startsWith('image/')} disabled={!canWriteItem(selected)} defaultValue={selected.altText}/></label><label>Caption<textarea name="caption" rows={3} disabled={!canWriteItem(selected)} defaultValue={selected.caption}/></label><label>Folder<input name="folder" list="media-folders" disabled={!canWriteItem(selected)} defaultValue={selected.folder}/></label><label>Category<input name="category" list="media-categories" disabled={!canWriteItem(selected)} defaultValue={selected.category}/></label><label>Credit<input name="credit" disabled={!canWriteItem(selected)} defaultValue={selected.metadata.credit || ''}/></label><label>Copyright<input name="copyright" disabled={!canWriteItem(selected)} defaultValue={selected.metadata.copyright || ''}/></label><label>License<input name="license" disabled={!canWriteItem(selected)} defaultValue={selected.metadata.license || ''}/></label><label>Tags<input name="tags" disabled={!canWriteItem(selected)} defaultValue={selected.metadata.tags || ''}/></label><label className="nk-admin-checkbox"><input name="active" type="checkbox" disabled={!canWriteItem(selected)} defaultChecked={selected.active}/><span>Active and publicly accessible</span></label><label>Workspace<input readOnly value={selected.scope}/></label></div><section className="nk-admin-usage"><header><b>Website usage</b><span>{usageLoading ? 'Checking…' : `${usage.length} placement${usage.length === 1 ? '' : 's'}`}</span></header>{usageLoading ? <p><LoaderCircle className="nk-admin-spin"/>Scanning drafts and published content…</p> : usage.length ? <ul>{usage.map((entry, index) => <li key={`${entry.id}-${entry.state}-${entry.path}-${index}`}><span>{entry.kind} · {entry.state}</span><b>{entry.title}</b><small>{entry.path}</small></li>)}</ul> : <p><Check/>This asset is not referenced by website content.</p>}</section>{uploadProgress && <p className="nk-admin-upload-progress"><LoaderCircle className="nk-admin-spin"/>{uploadProgress}</p>}{canWriteItem(selected) && <footer><button className="nk-admin-primary" disabled={busy}><Save/>{busy ? 'Saving…' : 'Save metadata'}</button><button type="button" onClick={() => void copyUrl(selected)}><Link2/>Copy URL</button><button type="button" onClick={() => void duplicate(selected)} disabled={busy}><Copy/>Duplicate</button>{user?.role === 'owner' && <button type="button" className="danger" onClick={() => void remove(selected)} disabled={busy || usage.length > 0}><Trash2/>{usage.length ? 'Used by website' : 'Delete permanently'}</button>}</footer>}</form></div></section></div>}
  </div>;
}
