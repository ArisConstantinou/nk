import {useState, type DragEvent} from 'react';
import {ChevronDown, ChevronRight, Eye, EyeOff, FolderPlus, ImagePlus, Library, Plus, Trash2, X} from 'lucide-react';
import {adminApi, errorMessage} from '../../admin/api';
import type {MediaAsset} from '../../admin/types';
import {createStableId, type ExperienceAsset, type ExperienceAssetGroup, type ExperienceDocument} from '../engine/schema';

type Props = {
  document: ExperienceDocument;
  onChange: (document: ExperienceDocument) => void;
  onApplyAsset: (asset: ExperienceAsset) => void;
};

const replaceGroup = (document: ExperienceDocument, groupId: string, change: (group: ExperienceAssetGroup) => ExperienceAssetGroup) => ({
  ...document,
  assetGroups: document.assetGroups.map(group => group.id === groupId ? change(group) : group),
});

export function AssetManager({document, onChange, onApplyAsset}: Props) {
  const [mediaOpen, setMediaOpen] = useState(false);
  const [media, setMedia] = useState<MediaAsset[]>([]);
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const openMedia = async (groupId: string) => {
    setTargetGroupId(groupId);
    setMediaOpen(true);
    setLoading(true);
    setError('');
    try {
      const response = await adminApi<{media: MediaAsset[]}>('/media');
      setMedia(response.media.filter(item => item.active && (item.mimeType.startsWith('image/') || item.mimeType === 'image/svg+xml')));
    } catch (nextError) {
      setError(errorMessage(nextError));
    } finally {
      setLoading(false);
    }
  };

  const addMediaAsset = (mediaAsset: MediaAsset) => {
    if (!targetGroupId) return;
    const exists = document.assetGroups.some(group => group.assets.some(asset => asset.source === mediaAsset.url));
    if (exists) {
      setError('This media item is already in the asset library.');
      return;
    }
    const asset: ExperienceAsset = {
      id: createStableId('asset'),
      name: mediaAsset.title || mediaAsset.filename,
      kind: mediaAsset.mimeType === 'image/svg+xml' ? 'svg' : 'image',
      source: mediaAsset.url,
      alt: mediaAsset.altText || mediaAsset.title || mediaAsset.filename,
    };
    onChange(replaceGroup(document, targetGroupId, group => ({...group, assets: [...group.assets, asset]})));
    setMediaOpen(false);
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

  const removeAsset = (groupId: string, assetId: string) => {
    if (!window.confirm('Remove this asset reference from the library? Existing layers will show as missing until replaced.')) return;
    onChange(replaceGroup(document, groupId, group => ({...group, assets: group.assets.filter(asset => asset.id !== assetId)})));
  };

  return <section className="ix-library" aria-label="Asset library">
    <header className="ix-panel-heading">
      <div><Library/><span><b>Asset library</b><small>Grouped references · no embedded files</small></span></div>
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
          <button type="button" onClick={() => void openMedia(group.id)} aria-label="Add from media library"><ImagePlus/></button>
          {!group.assets.length && <button type="button" onClick={() => onChange({...document, assetGroups: document.assetGroups.filter(item => item.id !== group.id)})} aria-label="Remove empty group"><Trash2/></button>}
        </header>
        {!group.collapsed && <div className="ix-asset-group__body">
          {!group.assets.length && <button className="ix-library__add-media" type="button" onClick={() => void openMedia(group.id)}><ImagePlus/>Add from Media</button>}
          {group.assets.map(asset => <div
            key={asset.id}
            className="ix-asset-card"
            draggable
            onDragStart={event => startAssetDrag(event, group, asset)}
            onDragOver={event => event.preventDefault()}
            onDrop={event => {event.stopPropagation(); dropIntoGroup(event, group.id, asset.id);}}
          >
            <div className="ix-asset-card__preview">{asset.source ? <img src={asset.source} alt=""/> : <Library/>}</div>
            <div><b>{asset.name}</b><small>{asset.kind.toUpperCase()}</small></div>
            <button type="button" onClick={() => onApplyAsset(asset)}>Apply</button>
            <button type="button" onClick={() => removeAsset(group.id, asset.id)} aria-label={`Remove ${asset.name}`}><X/></button>
          </div>)}
        </div>}
      </article>)}
    </div>
    <p className="ix-library__hint">Drag an asset onto the stage, or use Apply. Drag cards between groups to reorganise them.</p>

    {mediaOpen && <div className="ix-media-picker-backdrop" role="presentation" onMouseDown={event => {if (event.target === event.currentTarget) setMediaOpen(false);}}>
      <section className="ix-media-picker" role="dialog" aria-modal="true" aria-label="Choose media asset">
        <header><div><ImagePlus/><span><b>Add from secure Media</b><small>References stay reusable; files are not copied into the timeline.</small></span></div><button type="button" onClick={() => setMediaOpen(false)} aria-label="Close"><X/></button></header>
        {loading ? <p>Loading media…</p> : error ? <p className="ix-error">{error}</p> : <div className="ix-media-picker__grid">
          {media.map(asset => <button type="button" key={asset.id} onClick={() => addMediaAsset(asset)}><img src={asset.url} alt=""/><span>{asset.title || asset.filename}</span></button>)}
          {!media.length && <p>No active image or SVG media is available yet. Upload files in Media first.</p>}
        </div>}
      </section>
    </div>}
  </section>;
}
