import {
  DEFAULT_STAGE_HEIGHT,
  DEFAULT_STAGE_WIDTH,
  EXPERIENCE_SCHEMA_VERSION,
  type ExperienceDocument,
  type ExperienceLayerType,
} from './schema';

const layerTypes = new Set<ExperienceLayerType>(['asset', 'placeholder', 'rectangle', 'ellipse', 'line', 'arrow', 'path', 'parametric-path', 'text']);
const calibrationRoles = new Set(['wall-corner', 'wall-floor', 'floor-depth']);
const surfaceKinds = new Set(['wall', 'floor', 'ceiling', 'custom']);
const surfaceGeometries = new Set(['flat', 'curved']);
const stableId = /^[a-z][a-z0-9-]{2,100}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isExperienceDocument(value: unknown): value is ExperienceDocument {
  if (!value || typeof value !== 'object') return false;
  const document = value as ExperienceDocument;
  if (document.schemaVersion !== EXPERIENCE_SCHEMA_VERSION || !stableId.test(document.id) || !slugPattern.test(document.slug)) return false;
  if (!document.title || document.title.length > 160 || !Array.isArray(document.sections) || document.sections.length < 1 || document.sections.length > 100) return false;
  if (!document.stage || document.stage.width !== DEFAULT_STAGE_WIDTH || document.stage.height !== DEFAULT_STAGE_HEIGHT) return false;
  if (!Array.isArray(document.assetGroups) || document.assetGroups.length > 60) return false;
  const ids = new Set<string>();
  const addId = (id: unknown) => {
    if (typeof id !== 'string' || !stableId.test(id) || ids.has(id)) return false;
    ids.add(id);
    return true;
  };
  for (const group of document.assetGroups) {
    if (!addId(group.id) || typeof group.name !== 'string' || group.name.length > 120 || !Array.isArray(group.assets) || group.assets.length > 500) return false;
    for (const asset of group.assets) {
      if (!addId(asset.id) || !['image', 'svg'].includes(asset.kind) || typeof asset.source !== 'string' || asset.source.length > 2_000) return false;
      if (/^\s*(?:data|javascript):/i.test(asset.source)) return false;
    }
  }
  for (const section of document.sections) {
    if (!addId(section.id) || typeof section.name !== 'string' || section.name.length > 160 || !Array.isArray(section.layers) || section.layers.length > 400) return false;
    if (!section.focus || !Number.isFinite(section.focus.x) || !Number.isFinite(section.focus.y)) return false;
    const surfaceIds = new Set<string>();
    if (section.surfaces != null) {
      if (!Array.isArray(section.surfaces) || section.surfaces.length > 40) return false;
      for (const surface of section.surfaces) {
        if (
          !surface
          || typeof surface.id !== 'string'
          || !stableId.test(surface.id)
          || surfaceIds.has(surface.id)
          || typeof surface.name !== 'string'
          || surface.name.length > 120
          || !surfaceKinds.has(surface.kind)
          || !surfaceGeometries.has(surface.geometry)
          || !Array.isArray(surface.points)
          || surface.points.length < 3
          || surface.points.length > 64
          || surface.points.some(point => !Number.isFinite(point?.x) || !Number.isFinite(point?.y))
          || !Array.isArray(surface.guideLayerIds)
          || surface.guideLayerIds.length > 16
          || surface.guideLayerIds.some(id => typeof id !== 'string' || !stableId.test(id))
        ) return false;
        surfaceIds.add(surface.id);
      }
    }
    const layerIds = new Set<string>();
    for (const layer of section.layers) {
      if (typeof layer.id !== 'string' || !stableId.test(layer.id) || layerIds.has(layer.id) || !layerTypes.has(layer.type) || typeof layer.name !== 'string' || layer.name.length > 160) return false;
      layerIds.add(layer.id);
      const transform = layer.transform;
      if (!transform || [transform.x, transform.y, transform.width, transform.height, transform.rotation, transform.skewX, transform.skewY].some(number => !Number.isFinite(number))) return false;
      if (transform.width < 1 || transform.height < 1 || transform.width > 7_680 || transform.height > 4_320 || Math.abs(transform.x) > 15_000 || Math.abs(transform.y) > 15_000) return false;
      if (layer.opacity < 0 || layer.opacity > 1 || (layer.points && layer.points.length > 20_000)) return false;
      if (layer.type === 'asset' && (typeof layer.assetId !== 'string' || (layer.assetFit != null && !['contain', 'cover'].includes(layer.assetFit)))) return false;
      if (layer.calibrationRole != null && !calibrationRoles.has(layer.calibrationRole)) return false;
      if (layer.surfaceId != null && (typeof layer.surfaceId !== 'string' || !stableId.test(layer.surfaceId))) return false;
      if (layer.type === 'text' && (typeof layer.text !== 'string' || layer.text.length > 2_000)) return false;
      if (layer.type === 'parametric-path') {
        const settings = layer.parametric;
        if (!settings || !['wall-channel', 'flex-conduit'].includes(settings.renderer) || !stableId.test(settings.routeId)) return false;
        if (!Array.isArray(layer.points) || layer.points.length < 2 || layer.points.length > 200) return false;
        if (!Number.isFinite(settings.widthMm) || settings.widthMm < 5 || settings.widthMm > 160) return false;
        if (settings.depthMm != null && (!Number.isFinite(settings.depthMm) || settings.depthMm < 1 || settings.depthMm > 100)) return false;
        if (settings.roughness != null && (!Number.isFinite(settings.roughness) || settings.roughness < 0 || settings.roughness > 1)) return false;
        if (settings.chaseStyle != null && !['hand-broken', 'machine-cut'].includes(settings.chaseStyle)) return false;
        if (settings.corrugationMm != null && (!Number.isFinite(settings.corrugationMm) || settings.corrugationMm < 1 || settings.corrugationMm > 20)) return false;
        if (settings.bendRadiusMm != null && (!Number.isFinite(settings.bendRadiusMm) || settings.bendRadiusMm < 10 || settings.bendRadiusMm > 500)) return false;
      }
    }
  }
  return true;
}

export function assertExperienceDocument(value: unknown): asserts value is ExperienceDocument {
  if (!isExperienceDocument(value)) throw new Error('The interactive document is invalid or uses an unsupported schema.');
}
