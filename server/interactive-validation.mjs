import {ApiError, cleanText} from './security.mjs';

const ID_PATTERN = /^[a-z][a-z0-9-]{2,100}$/i;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LAYER_TYPES = new Set(['asset', 'placeholder', 'rectangle', 'ellipse', 'line', 'arrow', 'path', 'parametric-path', 'text']);
const ASSET_KINDS = new Set(['image', 'svg']);
const CALIBRATION_ROLES = new Set(['wall-corner', 'wall-floor', 'floor-depth']);
const SURFACE_KINDS = new Set(['wall', 'floor', 'ceiling', 'custom']);
const SURFACE_GEOMETRIES = new Set(['flat', 'curved']);

const invalid = (message = 'The interactive document is invalid.') => {
  throw new ApiError(400, 'invalid_interactive_document', message);
};

const validId = value => typeof value === 'string' && ID_PATTERN.test(value);
const finite = value => typeof value === 'number' && Number.isFinite(value);
const shortString = (value, max) => typeof value === 'string' && value.length <= max;

export function validateInteractiveDocument(value, expectedSlug) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) invalid();
  if (value.schemaVersion !== 1) invalid('This interactive document schema is not supported.');
  if (!validId(value.id) || !SLUG_PATTERN.test(value.slug || '') || (expectedSlug && value.slug !== expectedSlug)) invalid('The interactive document identity is invalid.');
  if (!shortString(value.title, 160) || !value.title.trim() || !shortString(value.description || '', 2_000)) invalid('The interactive title or description is invalid.');
  if (!value.stage || value.stage.width !== 1920 || value.stage.height !== 1080 || !shortString(value.stage.background || '', 80)) invalid('The stage must use the fixed 1920 × 1080 logical coordinate system.');
  if (!value.settings || !['cut', 'crossfade'].includes(value.settings.transition) || typeof value.settings.showProgress !== 'boolean') invalid('The presentation settings are invalid.');
  if (!Array.isArray(value.assetGroups) || value.assetGroups.length > 60) invalid('The asset-group structure is invalid.');
  if (!Array.isArray(value.sections) || value.sections.length < 1 || value.sections.length > 100) invalid('An experience needs between 1 and 100 frames.');

  const globalIds = new Set();
  const addGlobalId = id => {
    if (!validId(id) || globalIds.has(id)) invalid('Stable section, group and asset IDs must be valid and unique.');
    globalIds.add(id);
  };

  for (const group of value.assetGroups) {
    if (!group || typeof group !== 'object') invalid();
    addGlobalId(group.id);
    if (!shortString(group.name, 120) || typeof group.visible !== 'boolean' || typeof group.collapsed !== 'boolean' || !Array.isArray(group.assets) || group.assets.length > 500) invalid('An asset group is invalid.');
    for (const asset of group.assets) {
      addGlobalId(asset?.id);
      if (!shortString(asset.name, 160) || !ASSET_KINDS.has(asset.kind) || !shortString(asset.source, 2_000) || !shortString(asset.alt || '', 500)) invalid('An asset reference is invalid.');
      if (/^\s*(?:data|javascript):/i.test(asset.source)) invalid('Embedded data and executable asset URLs are not allowed. Use the secure Media library.');
      if (!/^(?:\/?assets\/|\/api\/admin\/media\/|https:\/\/)/i.test(asset.source)) invalid('Assets must reference secure Media, a public site asset, or an HTTPS source.');
    }
  }

  for (const section of value.sections) {
    addGlobalId(section?.id);
    if (!shortString(section.name, 160) || !section.name.trim() || !shortString(section.description || '', 2_000) || !shortString(section.background || '', 80)) invalid('A frame is invalid.');
    if (!section.focus || !finite(section.focus.x) || !finite(section.focus.y) || !Array.isArray(section.layers) || section.layers.length > 400) invalid('A frame focus or layer collection is invalid.');
    const surfaceIds = new Set();
    if (section.surfaces !== undefined) {
      if (!Array.isArray(section.surfaces) || section.surfaces.length > 40) invalid('A frame surface collection is invalid.');
      for (const surface of section.surfaces) {
        if (
          !surface
          || !validId(surface.id)
          || surfaceIds.has(surface.id)
          || !shortString(surface.name, 120)
          || !SURFACE_KINDS.has(surface.kind)
          || !SURFACE_GEOMETRIES.has(surface.geometry)
          || !Array.isArray(surface.points)
          || surface.points.length < 3
          || surface.points.length > 64
          || surface.points.some(point => !finite(point?.x) || !finite(point?.y))
          || !Array.isArray(surface.guideLayerIds)
          || surface.guideLayerIds.length > 16
          || surface.guideLayerIds.some(id => !validId(id))
        ) invalid('A calibrated surface is invalid.');
        surfaceIds.add(surface.id);
      }
    }
    const layerIds = new Set();
    for (const layer of section.layers) {
      if (!validId(layer?.id) || layerIds.has(layer.id)) invalid('Layer IDs must be stable and unique inside each frame.');
      layerIds.add(layer.id);
      if (!shortString(layer.name, 160) || !LAYER_TYPES.has(layer.type) || typeof layer.visible !== 'boolean' || typeof layer.locked !== 'boolean') invalid('A layer is invalid.');
      if (!finite(layer.opacity) || layer.opacity < 0 || layer.opacity > 1) invalid('Layer opacity must be between 0 and 1.');
      const transform = layer.transform;
      if (!transform || ![transform.x, transform.y, transform.width, transform.height, transform.rotation, transform.skewX, transform.skewY].every(finite)) invalid('A layer transform is invalid.');
      if (transform.width < 1 || transform.height < 1 || transform.width > 7_680 || transform.height > 4_320 || Math.abs(transform.x) > 15_000 || Math.abs(transform.y) > 15_000 || Math.abs(transform.rotation) > 100_000 || Math.abs(transform.skewX) > 89 || Math.abs(transform.skewY) > 89) invalid('A layer transform is outside the supported range.');
      if (layer.type === 'asset' && !validId(layer.assetId)) invalid('An asset layer must reference an asset.');
      if (layer.calibrationRole !== undefined && !CALIBRATION_ROLES.has(layer.calibrationRole)) invalid('A calibration guide role is invalid.');
      if (layer.surfaceId !== undefined && !validId(layer.surfaceId)) invalid('An asset surface reference is invalid.');
      if (layer.type === 'text' && !shortString(layer.text || '', 2_000)) invalid('A text layer is too long.');
      if (layer.type === 'parametric-path') {
        const settings = layer.parametric;
        if (!settings || !['wall-channel', 'flex-conduit'].includes(settings.renderer) || !validId(settings.routeId)) invalid('A parametric route identity is invalid.');
        if (!Array.isArray(layer.points) || layer.points.length < 2 || layer.points.length > 200) invalid('A parametric route needs between 2 and 200 path nodes.');
        if (!finite(settings.widthMm) || settings.widthMm < 5 || settings.widthMm > 160) invalid('The parametric route width is invalid.');
        if (settings.depthMm !== undefined && (!finite(settings.depthMm) || settings.depthMm < 1 || settings.depthMm > 100)) invalid('The wall-channel depth is invalid.');
        if (settings.roughness !== undefined && (!finite(settings.roughness) || settings.roughness < 0 || settings.roughness > 1)) invalid('The wall-channel roughness is invalid.');
        if (settings.chaseStyle !== undefined && !['hand-broken', 'machine-cut'].includes(settings.chaseStyle)) invalid('The wall-channel cut style is invalid.');
        if (settings.corrugationMm !== undefined && (!finite(settings.corrugationMm) || settings.corrugationMm < 1 || settings.corrugationMm > 20)) invalid('The conduit corrugation is invalid.');
        if (settings.bendRadiusMm !== undefined && (!finite(settings.bendRadiusMm) || settings.bendRadiusMm < 10 || settings.bendRadiusMm > 500)) invalid('The route bend radius is invalid.');
        if (settings.color !== undefined && !shortString(settings.color, 100)) invalid('The conduit colour is invalid.');
      }
      if (layer.points !== undefined) {
        if (!Array.isArray(layer.points) || layer.points.length > 20_000 || layer.points.some(point => !finite(point?.x) || !finite(point?.y))) invalid('A vector path is invalid.');
      }
      for (const property of ['fill', 'stroke', 'description']) if (layer[property] !== undefined && !shortString(layer[property], property === 'description' ? 2_000 : 100)) invalid(`Layer ${property} is invalid.`);
      if (layer.strokeWidth !== undefined && (!finite(layer.strokeWidth) || layer.strokeWidth < 0 || layer.strokeWidth > 500)) invalid('Layer stroke width is invalid.');
      if (layer.fontSize !== undefined && (!finite(layer.fontSize) || layer.fontSize < 8 || layer.fontSize > 600)) invalid('Layer font size is invalid.');
    }
  }
  return value;
}

export function validateInteractiveInput(body, {expectedSlug, requireVersion = false} = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid();
  const slug = cleanText(body.slug ?? expectedSlug, 'slug', {min: 2, max: 100});
  if (!SLUG_PATTERN.test(slug) || (expectedSlug && slug !== expectedSlug)) invalid('The interactive slug is invalid or cannot be changed.');
  const title = cleanText(body.title, 'title', {min: 2, max: 160});
  const document = validateInteractiveDocument(body.document, slug);
  const expectedVersion = Number(body.expectedVersion);
  if (requireVersion && (!Number.isInteger(expectedVersion) || expectedVersion < 1)) throw new ApiError(400, 'invalid_version', 'A valid draft version is required.');
  return {slug, title, document, expectedVersion};
}
