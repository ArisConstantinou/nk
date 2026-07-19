import {useState, type DragEvent} from 'react';
import {Cable, Check, ChevronDown, ChevronRight, Eye, EyeOff, FolderPlus, ImagePlus, Library, LoaderCircle, Plus, Route, ScanLine, Trash2, Upload, X} from 'lucide-react';
import {adminApi, errorMessage} from '../../admin/api';
import {useAdminAuth} from '../../admin/auth/AdminAuth';
import {useAdminConfirm} from '../../admin/components/ConfirmDialog';
import {isPagesAdminMode} from '../../admin/pagesMode';
import type {MediaAsset} from '../../admin/types';
import {createStableId, type ExperienceAsset, type ExperienceAssetGroup, type ExperienceDocument} from '../engine/schema';

type Props = {
  document: ExperienceDocument;
  onChange: (document: ExperienceDocument) => void;
  onApplyAsset: (asset: ExperienceAsset, placement: 'object' | 'background') => void;
  onAddParametricRoute: () => void;
  onTraceAssetRoutes: (asset: ExperienceAsset, targetGroupId?: string) => Promise<number>;
};

const replaceGroup = (document: ExperienceDocument, groupId: string, change: (group: ExperienceAssetGroup) => ExperienceAssetGroup) => ({
  ...document,
  assetGroups: document.assetGroups.map(group => group.id === groupId ? change(group) : group),
});

const importMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
const maximumImportSize = isPagesAdminMode ? 3 * 1024 * 1024 : 25 * 1024 * 1024;
const importMimeType = (file: File) => file.type || ({
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
} as Record<string, string>)[file.name.toLowerCase().match(/\.[^.]+$/)?.[0] || ''] || '';
const titleFromFilename = (filename: string) => filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Imported asset';
const mediaToExperienceAsset = (mediaAsset: MediaAsset): ExperienceAsset => ({
  id: createStableId('asset'),
  name: mediaAsset.title || mediaAsset.filename,
  kind: mediaAsset.mimeType === 'image/svg+xml' ? 'svg' : 'image',
  source: mediaAsset.url,
  alt: mediaAsset.altText || mediaAsset.title || mediaAsset.filename,
});
const fileToBase64 = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
  reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
  reader.readAsDataURL(file);
});

export function AssetManager({document, onChange, onApplyAsset, onAddParametricRoute, onTraceAssetRoutes}: Props) {
  const confirm = useAdminConfirm();
  const {user} = useAdminAuth();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaPurpose, setMediaPurpose] = useState<'asset' | 'trace'>('asset');
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [deletingMediaId, setDeletingMediaId] = useState<string | null>(null);
  const [tracingAssetId, setTracingAssetId] = useState<string | null>(null);
  const [traceMessage, setTraceMessage] = useState('');

  const addGroup = () => {
    const next: ExperienceAssetGroup = {
      id: createStableId('group'),
      name: 'New asset group',
      visible: true,
      collapsed: false,
      assets: [],
    };
    onChange({...document, assetGroups: [...document.assetGroups, next]});
  };

  const openMedia = async (groupId: string, purpose: 'asset' | 'trace' = 'asset') => {
    setTargetGroupId(groupId);
    setMediaPurpose(purpose);
    setMediaOpen(true);
    setLoading(true);
    setError('');
    setUploadMessage('');
    setDragActive(false);
    try {
      const response = await adminApi<{media: MediaAsset[]}>('/media');
      setMedia(response.media.filter(item => item.active && (item.mimeType.startsWith('image/') || item.mimeType === 'image/svg+xml')));
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  const openTraceMedia = () => {
    const target = document.assetGroups.find(group => group.name.toLowerCase().includes('first fix')) || document.assetGroups[0];
    if (target) {
      void openMedia(target.id, 'trace');
      return;
    }
    const group: ExperienceAssetGroup = {
      id: createStableId('group'),
      name: 'Traced routes',
      visible: true,
      collapsed: false,
      assets: [],
    };
    onChange({...document, assetGroups: [...document.assetGroups, group]});
    void openMedia(group.id, 'trace');
  };

  const addMediaAsset = (mediaAsset: MediaAsset) => {
    if (!targetGroupId) return;
    const exists = document.assetGroups.some(group => group.assets.some(asset => asset.source === mediaAsset.url));
    if (exists) {
      setError('This media item is already in the asset library.');
      return;
    }
    const asset = mediaToExperienceAsset(mediaAsset);
    onChange(replaceGroup(document, targetGroupId, group => ({...group, assets: [...group.assets, asset]})));
    setMediaOpen(false);
  };

  const deleteMediaAsset = async (mediaAsset: MediaAsset) => {
    if (user?.role !== 'owner' || deletingMediaId || uploading) return;
    const localReferences = document.assetGroups
      .flatMap(group => group.assets)
      .filter(asset => asset.source === mediaAsset.url);
    if (localReferences.length) {
      setError('Remove this asset from the Interactive Studio library before deleting its Media file.');
      return;
    }
    const accepted = await confirm({
      eyebrow: 'MEDIA ASSET',
      title: `Permanently delete “${mediaAsset.title || mediaAsset.filename}”?`,
      description: 'The original Media file and every optimized stored variant will be removed.',
      detail: 'This cannot be undone. Assets used by the website or another saved experience cannot be deleted.',
      confirmLabel: 'Delete media',
      cancelLabel: 'Keep asset',
      tone: 'danger',
    });
    if (!accepted) return;
    setDeletingMediaId(mediaAsset.id);
    setError('');
    setUploadMessage('');
    try {
      await adminApi(`/media/${mediaAsset.id}`, {method: 'DELETE'});
      setMedia(current => current.filter(asset => asset.id !== mediaAsset.id));
      setUploadMessage('Media asset permanently deleted.');
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setDeletingMediaId(null);
    }
  };

  const attachImportedMedia = (created: MediaAsset[], groupId: string) => {
    if (!created.length) return;
    const existingSources = new Set(document.assetGroups.flatMap(group => group.assets.map(asset => asset.source)));
    const assets: ExperienceAsset[] = created.filter(item => !existingSources.has(item.url)).map(item => ({
      id: createStableId('asset'),
      name: item.title || item.filename,
      kind: item.mimeType === 'image/svg+xml' ? 'svg' : 'image',
      source: item.url,
      alt: item.altText || item.title || item.filename,
    }));
    if (assets.length) onChange(replaceGroup(document, groupId, group => ({...group, assets: [...group.assets, ...assets]})));
    setMedia(current => [...created, ...current.filter(item => !created.some(next => next.id === item.id))]);
  };

  const traceAsset = async (asset: ExperienceAsset, groupId?: string) => {
    setTracingAssetId(asset.id);
    setTraceMessage(`Detecting route lines in ${asset.name}…`);
    try {
      const count = await onTraceAssetRoutes(asset, groupId);
      setTraceMessage(`${count} editable 40 mm channel + 20 mm corrugated conduit route${count === 1 ? '' : 's'} created.`);
      return count;
    } catch (nextError) {
      setTraceMessage(errorMessage(nextError));
      throw nextError;
    } finally {
      setTracingAssetId(null);
    }
  };

  const traceMediaAsset = async (mediaAsset: MediaAsset) => {
    if (!targetGroupId) return;
    const existing = document.assetGroups.flatMap(group => group.assets).find(asset => asset.source === mediaAsset.url);
    setError('');
    try {
      await traceAsset(existing || mediaToExperienceAsset(mediaAsset), targetGroupId);
      setMediaOpen(false);
    } catch (nextError) {
      setError(errorMessage(nextError));
      throw nextError;
    }
  };

  const importFiles = async (files: FileList | File[]) => {
    if (!targetGroupId || uploading) return;
    const candidates = [...files];
    if (mediaPurpose === 'trace' && candidates.length !== 1) {
      setError('Choose one line image at a time for automatic tracing.');
      return;
    }
    const valid = candidates.filter(file => importMimeTypes.includes(importMimeType(file)) && file.size > 0 && file.size <= maximumImportSize);
    if (!valid.length || valid.length !== candidates.length) {
      setError(`Choose JPG, PNG, WEBP or SVG files up to ${isPagesAdminMode ? '3' : '25'} MB each.`);
      return;
    }
    const groupId = targetGroupId;
    const groupName = document.assetGroups.find(group => group.id === groupId)?.name || 'Interactive Studio';
    const created: MediaAsset[] = [];
    setUploading(true);
    setDragActive(false);
    setError('');
    try {
      for (const [index, file] of valid.entries()) {
        setUploadMessage(`Importing ${index + 1} of ${valid.length}: ${file.name}`);
        const title = titleFromFilename(file.name);
        const result = await adminApi<{media: MediaAsset}>('/media', {
          method: 'POST',
          body: JSON.stringify({
            filename: file.name,
            mimeType: importMimeType(file),
            base64: await fileToBase64(file),
            title,
            altText: title,
            caption: '',
            folder: 'Interactive Studio',
            category: groupName,
            metadata: {tags: 'interactive-studio'},
          }),
        });
        created.push(result.media);
      }
      if (mediaPurpose === 'trace') {
        const tracedAsset = mediaToExperienceAsset(created[0]);
        setMedia(current => [created[0], ...current.filter(item => item.id !== created[0].id)]);
        const count = await traceAsset(tracedAsset, groupId);
        setUploadMessage(`${created[0].filename} imported · ${count} corrugated conduit route${count === 1 ? '' : 's'} created.`);
        window.setTimeout(() => setMediaOpen(false), 650);
      } else {
        attachImportedMedia(created, groupId);
        setUploadMessage(`${created.length} asset${created.length === 1 ? '' : 's'} imported and added to ${groupName}.`);
        window.setTimeout(() => setMediaOpen(false), 500);
      }
    } catch (nextError) {
      if (created.length && mediaPurpose !== 'trace') attachImportedMedia(created, groupId);
      else if (created.length) {
        const fallbackAsset = mediaToExperienceAsset(created[0]);
        const exists = document.assetGroups.some(group => group.assets.some(asset => asset.source === fallbackAsset.source));
        if (!exists) onChange(replaceGroup(document, groupId, group => ({...group, assets: [...group.assets, fallbackAsset]})));
        setMedia(current => [created[0], ...current.filter(item => item.id !== created[0].id)]);
      }
      setError(`${created.length ? `${created.length} file${created.length === 1 ? ' was' : 's were'} imported before the error. ` : ''}${errorMessage(nextError)}`);
    } finally {
      setUploading(false);
    }
  };

  const startAssetDrag = (event: DragEvent, group: ExperienceAssetGroup, asset: ExperienceAsset) => {
    event.dataTransfer.effectAllowed = 'copyMove';
    event.dataTransfer.setData('application/x-nk-experience-asset', JSON.stringify({id: asset.id, name: asset.name}));
    event.dataTransfer.setData('application/x-nk-library-asset', JSON.stringify({id: asset.id, fromGroupId: group.id}));
  };

  const dropIntoGroup = (event: DragEvent, groupId: string, beforeAssetId?: string) => {
    event.preventDefault();
    try {
      const payload = JSON.parse(event.dataTransfer.getData('application/x-nk-library-asset')) as {id: string; fromGroupId: string};
      const sourceGroup = document.assetGroups.find(group => group.id === payload.fromGroupId);
      const asset = sourceGroup?.assets.find(item => item.id === payload.id);
      if (!sourceGroup || !asset) return;
      const groups = document.assetGroups.map(group => ({...group, assets: group.assets.filter(item => item.id !== asset.id)}));
      const target = groups.find(group => group.id === groupId);
      if (!target) return;
      const index = beforeAssetId ? target.assets.findIndex(item => item.id === beforeAssetId) : -1;
      if (index < 0) target.assets.push(asset);
      else target.assets.splice(index, 0, asset);
      onChange({...document, assetGroups: groups});
    } catch {
      // Ignore unrelated drags.
    }
  };

  const removeAsset = async (groupId: string, assetId: string) => {
    const asset = document.assetGroups.find(group => group.id === groupId)?.assets.find(item => item.id === assetId);
    const accepted = await confirm({
      eyebrow: 'ASSET REFERENCE',
      title: `Remove ${asset?.name || 'this asset'} from the library?`,
      description: 'The source file is not deleted, but this reusable reference will no longer be available in the Interactive Studio.',
      detail: 'Layers already using this reference may appear missing until you replace their asset.',
      confirmLabel: 'Remove reference',
      cancelLabel: 'Keep asset',
      tone: 'warning',
    });
    if (!accepted) return;
    onChange(replaceGroup(document, groupId, group => ({...group, assets: group.assets.filter(asset => asset.id !== assetId)})));
  };

  return <section className="ix-library" aria-label="Frame content">
    <header className="ix-panel-heading ix-library__heading">
      <div><Plus/><span><b>Frame content</b><small>Choose a route or reusable image</small></span></div>
    </header>
    <section className="ix-library__routes" aria-label="Electrical routes">
      <header><Route/><span><b>Electrical routes</b><small>How do you want to create the route?</small></span></header>
      <button className="ix-library__route-action ix-library__route-action--trace" type="button" onClick={openTraceMedia}>
        <ScanLine/>
        <span><b>Trace from image</b><small>Import a marked line drawing</small></span>
        <ImagePlus/>
      </button>
      <button className="ix-library__route-action" type="button" onClick={onAddParametricRoute}><Cable/><span><b>Draw route</b><small>40 mm channel + 20 mm flexible conduit</small></span><Plus/></button>
    </section>
    <header className="ix-panel-heading ix-library__media-heading">
      <div><Library/><span><b>Media assets</b><small>Reusable images organised by group</small></span></div>
      <button type="button" onClick={addGroup} aria-label="Add asset group" title="Add group"><FolderPlus/></button>
    </header>
    <div className="ix-library__groups">
      {!document.assetGroups.length && <div className="ix-empty-state"><p>No groups yet.</p><button type="button" onClick={addGroup}><Plus/>Create first group</button></div>}
      {document.assetGroups.map(group => <article
        key={group.id}
        className={`ix-asset-group ${group.visible ? '' : 'is-hidden'}`}
        onDragOver={event => event.preventDefault()}
        onDrop={event => dropIntoGroup(event, group.id)}
      >
        <header>
          <button type="button" onClick={() => onChange(replaceGroup(document, group.id, current => ({...current, collapsed: !current.collapsed})))} aria-label={group.collapsed ? 'Expand group' : 'Collapse group'}>{group.collapsed ? <ChevronRight/> : <ChevronDown/>}</button>
          <input value={group.name} onChange={event => onChange(replaceGroup(document, group.id, current => ({...current, name: event.target.value})))} aria-label="Asset group name"/>
          <span>{group.assets.length}</span>
          <button type="button" onClick={() => onChange(replaceGroup(document, group.id, current => ({...current, visible: !current.visible})))} aria-label={group.visible ? 'Hide group' : 'Show group'}>{group.visible ? <Eye/> : <EyeOff/>}</button>
          <button type="button" onClick={() => void openMedia(group.id)} aria-label="Import a file or choose from Media"><ImagePlus/></button>
          {!group.assets.length && <button type="button" onClick={() => onChange({...document, assetGroups: document.assetGroups.filter(item => item.id !== group.id)})} aria-label="Remove empty group"><Trash2/></button>}
        </header>
        {!group.collapsed && <div className="ix-asset-group__body">
          {!group.assets.length && <div className="ix-asset-group__empty" role="status">
            <b>Empty</b>
            <small>No assets in this group</small>
          </div>}
          {group.assets.map(asset => <div
            key={asset.id}
            className={`ix-asset-card ${group.name.toLowerCase().includes('background') ? 'ix-asset-card--background' : ''}`}
            draggable
            onDragStart={event => startAssetDrag(event, group, asset)}
            onDragOver={event => event.preventDefault()}
            onDrop={event => {event.stopPropagation(); dropIntoGroup(event, group.id, asset.id);}}
          >
            <div className="ix-asset-card__preview">{asset.source ? <img src={asset.source} alt=""/> : <Library/>}</div>
            <div><b>{asset.name}</b><small>{asset.kind.toUpperCase()}</small></div>
            <button type="button" onClick={() => onApplyAsset(asset, group.name.toLowerCase().includes('background') ? 'background' : 'object')}>
              {group.name.toLowerCase().includes('background') ? 'Set background' : 'Apply'}
            </button>
            {!group.name.toLowerCase().includes('background') && <button
              type="button"
              className="ix-asset-card__trace"
              onClick={() => void traceAsset(asset).catch(() => undefined)}
              disabled={tracingAssetId !== null}
              aria-label={`Auto trace route lines from ${asset.name}`}
              title="Detect route lines and create editable wall channels with corrugated conduit"
            >
              {tracingAssetId === asset.id ? <LoaderCircle className="nk-admin-spin"/> : <ScanLine/>}<span>Trace</span>
            </button>}
            <button type="button" onClick={() => void removeAsset(group.id, asset.id)} aria-label={`Remove ${asset.name}`}><X/></button>
          </div>)}
        </div>}
      </article>)}
    </div>
    {traceMessage && <p className="ix-library__trace-message" aria-live="polite"><ScanLine/>{traceMessage}</p>}

    {mediaOpen && <div className="ix-media-picker-backdrop" role="presentation" onMouseDown={event => {if (!uploading && event.target === event.currentTarget) setMediaOpen(false);}}>
      <section className="ix-media-picker" role="dialog" aria-modal="true" aria-label={mediaPurpose === 'trace' ? 'Import a line image and auto trace routes' : 'Import or choose an asset'}>
        <header><div>{mediaPurpose === 'trace' ? <ScanLine/> : <ImagePlus/>}<span><b>{mediaPurpose === 'trace' ? 'Import a line image and auto-trace it' : 'Import or choose an asset'}</b><small>{mediaPurpose === 'trace' ? 'Detected lines become editable 40 mm channels with 20 mm corrugated conduit.' : 'Imported files stay reusable in Media and are added to this asset group automatically.'}</small></span></div><button type="button" disabled={uploading} onClick={() => setMediaOpen(false)} aria-label="Close"><X/></button></header>
        <div className="ix-media-picker__body">
          <label
            className={`ix-media-picker__import ${dragActive ? 'is-dragging' : ''} ${uploading ? 'is-uploading' : ''}`}
            onDragEnter={event => {event.preventDefault(); if (!uploading) setDragActive(true);}}
            onDragOver={event => {event.preventDefault(); if (!uploading) setDragActive(true);}}
            onDragLeave={event => {if (event.currentTarget === event.target || !event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false);}}
            onDrop={event => {event.preventDefault(); setDragActive(false); void importFiles(event.dataTransfer.files);}}
          >
            {uploading ? <LoaderCircle className="nk-admin-spin"/> : uploadMessage ? <Check/> : <Upload/>}
            <span><b>{uploading ? (mediaPurpose === 'trace' ? 'Importing and tracing…' : 'Importing securely…') : mediaPurpose === 'trace' ? 'Drop one line image here or choose from this device' : 'Drop files here or choose from this device'}</b><small>{mediaPurpose === 'trace' ? 'Green, red or dark lines on a light background · ' : ''}JPG, PNG, WEBP or editable SVG · up to {isPagesAdminMode ? '3' : '25'} MB</small></span>
            <input hidden type="file" accept={importMimeTypes.join(',')} multiple={mediaPurpose !== 'trace'} disabled={uploading} onChange={event => {if (event.target.files) void importFiles(event.target.files); event.target.value = '';}}/>
          </label>
          {uploadMessage && <p className="ix-media-picker__status" aria-live="polite">{uploadMessage}</p>}
          {error && <p className="ix-error" role="alert">{error}</p>}
          <div className="ix-media-picker__separator"><span>{mediaPurpose === 'trace' ? 'or auto-trace an existing Media image' : 'or choose an existing Media asset'}</span></div>
          {loading ? <p className="ix-media-picker__loading"><LoaderCircle className="nk-admin-spin"/>Loading media…</p> : <div className="ix-media-picker__grid">
            {media.map(asset => <article className="ix-media-picker__asset" key={asset.id}>
              <button className="ix-media-picker__asset-select" type="button" disabled={uploading || deletingMediaId !== null || tracingAssetId !== null} onClick={() => mediaPurpose === 'trace' ? void traceMediaAsset(asset).catch(() => undefined) : addMediaAsset(asset)}>
                <img src={asset.url} alt=""/>
                <span><b>{asset.title || asset.filename}</b>{mediaPurpose === 'trace' && <small><ScanLine/>Auto-trace routes</small>}</span>
              </button>
              <button
                className="ix-media-picker__asset-delete"
                type="button"
                disabled={uploading || deletingMediaId !== null || user?.role !== 'owner'}
                onClick={() => void deleteMediaAsset(asset)}
                aria-label={`Delete ${asset.title || asset.filename}`}
                title={user?.role === 'owner' ? 'Permanently delete Media asset' : 'Only the owner can delete Media assets'}
              >
                {deletingMediaId === asset.id ? <LoaderCircle className="nk-admin-spin"/> : <Trash2/>}
              </button>
            </article>)}
            {!media.length && <p className="ix-media-picker__empty">No existing image or SVG assets yet. Import one above to continue.</p>}
          </div>}
        </div>
      </section>
    </div>}
  </section>;
}
