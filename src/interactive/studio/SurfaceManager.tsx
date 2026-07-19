import {Check, Minus, PanelBottom, RefreshCw, ScanSearch, Spline, SquareDashed, Trash2, UnfoldVertical} from 'lucide-react';
import type {ExperienceSurface} from '../engine/schema';

type Props = {
  surfaces: ExperienceSurface[];
  selectedSurfaceId: string | null;
  selectedGuideCount: number;
  guideCount: number;
  message: string;
  onSelectSurface: (surfaceId: string) => void;
  onAddGuides: () => void;
  onDetectSurfaces: () => void;
  onUpdateSurface: (surfaceId: string, patch: Partial<ExperienceSurface>) => void;
  onClearCalibration: () => void;
};

const surfaceTypeLabel = (surface: ExperienceSurface) => (
  surface.kind === 'wall'
    ? `${surface.geometry === 'curved' ? 'Curved' : 'Flat'} wall`
    : surface.kind[0].toUpperCase() + surface.kind.slice(1)
);

export function SurfaceManager({
  surfaces,
  selectedSurfaceId,
  selectedGuideCount,
  guideCount,
  message,
  onSelectSurface,
  onAddGuides,
  onDetectSurfaces,
  onUpdateSurface,
  onClearCalibration,
}: Props) {
  return <section className="ix-surface-manager" aria-label="Surface calibration">
    <header>
      <div className="ix-surface-manager__title">
        <ScanSearch/>
        <span><b>Surface calibration</b><small>Guides become placement targets</small></span>
      </div>
      <div className="ix-surface-manager__actions" role="toolbar" aria-label="Surface calibration actions">
        <button
          type="button"
          onClick={onAddGuides}
          disabled={guideCount > 0}
          aria-label="Add three room calibration guides"
          data-tooltip="Add 3 guides"
          title="Add three ready-made room calibration guides"
        >
          <SquareDashed/>
        </button>
        <button
          type="button"
          className="primary"
          onClick={onDetectSurfaces}
          aria-label={surfaces.length ? 'Recalibrate surfaces' : 'Detect surfaces'}
          data-tooltip={surfaces.length ? 'Recalibrate' : 'Detect surfaces'}
          title={selectedGuideCount >= 2 ? `Use ${selectedGuideCount} selected guide lines` : 'Use visible guide lines'}
        >
          {surfaces.length ? <RefreshCw/> : <ScanSearch/>}
        </button>
        {Boolean(surfaces.length || guideCount) && <button
          type="button"
          className="danger"
          onClick={onClearCalibration}
          aria-label="Clear surface calibration"
          data-tooltip="Clear calibration"
          title="Clear calibration"
        >
          <Trash2/>
        </button>}
      </div>
    </header>
    {!surfaces.length && <p className="ix-surface-manager__hint">Add preset guides, or draw a vertical corner and horizontal floor line, then detect.</p>}
    {message && <p className="ix-surface-manager__message" aria-live="polite">{message}</p>}
    {surfaces.length > 0 && <>
      <div className="ix-surface-manager__list-heading">
        <b>Placement targets</b>
        <span>{surfaces.length} surface{surfaces.length === 1 ? '' : 's'} · {guideCount} guide{guideCount === 1 ? '' : 's'}</span>
      </div>
      <div className="ix-surface-manager__surfaces" role="listbox" aria-label="Calibrated placement surfaces">
        {surfaces.map((surface, index) => {
          const selected = selectedSurfaceId === surface.id;
          const placeReference = `S${String(index + 1).padStart(2, '0')}`;
          return <article
            key={surface.id}
            role="option"
            aria-selected={selected}
            className={selected ? 'active' : ''}
          >
            <button
              type="button"
              className="ix-surface-manager__select"
              onClick={() => onSelectSurface(surface.id)}
              aria-label={`Select ${surface.name}`}
              data-tooltip={`Select ${surface.name}`}
              title={`Select ${surface.name}`}
            >
              {surface.kind === 'wall' ? <UnfoldVertical/> : <PanelBottom/>}
            </button>
            <label>
              <input
                value={surface.name}
                onFocus={() => onSelectSurface(surface.id)}
                onChange={event => onUpdateSurface(surface.id, {name: event.target.value})}
                aria-label={`${surface.name} surface name`}
              />
              <small>{placeReference} · {surfaceTypeLabel(surface)}</small>
            </label>
            {surface.kind === 'wall' && <button
              type="button"
              className="ix-surface-manager__geometry"
              onClick={() => onUpdateSurface(surface.id, {geometry: surface.geometry === 'curved' ? 'flat' : 'curved'})}
              aria-label={`Change ${surface.name} to a ${surface.geometry === 'curved' ? 'flat' : 'curved'} wall`}
              aria-pressed={surface.geometry === 'curved'}
              data-tooltip={surface.geometry === 'curved' ? 'Curved wall' : 'Flat wall'}
              title={`Currently ${surface.geometry}; switch to ${surface.geometry === 'curved' ? 'flat' : 'curved'} placement`}
            >
              {surface.geometry === 'curved' ? <Spline/> : <Minus/>}
            </button>}
            {selected && <Check className="ix-surface-manager__selected" aria-hidden="true"/>}
          </article>;
        })}
      </div>
      <footer>Choose a target, then apply or drag an asset onto it.</footer>
    </>}
  </section>;
}
