export const EXPERIENCE_SCHEMA_VERSION = 1 as const;
export const DEFAULT_STAGE_WIDTH = 1920;
export const DEFAULT_STAGE_HEIGHT = 1080;
export const DEFAULT_ROUTE_BEND_RADIUS_MM = 80;

export type ExperienceViewMode = 'page' | 'focus' | 'fullscreen';
export type ExperienceTool = 'select' | 'freehand' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'text';
export type ExperienceLayerType = 'asset' | 'placeholder' | 'rectangle' | 'ellipse' | 'line' | 'arrow' | 'path' | 'parametric-path' | 'text';
export type ParametricPathRenderer = 'wall-channel' | 'flex-conduit';
export type WallChaseStyle = 'hand-broken' | 'machine-cut';
export type ExperienceCalibrationRole = 'wall-corner' | 'wall-floor' | 'floor-depth';
export type ExperienceSurfaceKind = 'wall' | 'floor' | 'ceiling' | 'custom';
export type ExperienceSurfaceGeometry = 'flat' | 'curved';

export type ParametricPathSettings = {
  renderer: ParametricPathRenderer;
  routeId: string;
  widthMm: number;
  depthMm?: number;
  roughness?: number;
  chaseStyle?: WallChaseStyle;
  corrugationMm?: number;
  bendRadiusMm?: number;
  color?: string;
};

export type ExperiencePoint = {
  x: number;
  y: number;
};

export type LayerTransform = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  skewX: number;
  skewY: number;
};

export type ExperienceLayer = {
  id: string;
  name: string;
  type: ExperienceLayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  transform: LayerTransform;
  assetId?: string;
  assetFit?: 'contain' | 'cover';
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  points?: ExperiencePoint[];
  parametric?: ParametricPathSettings;
  calibrationRole?: ExperienceCalibrationRole;
  surfaceId?: string;
  description?: string;
};

export type ExperienceAsset = {
  id: string;
  name: string;
  kind: 'image' | 'svg';
  source: string;
  alt: string;
  width?: number;
  height?: number;
};

export type ExperienceAssetGroup = {
  id: string;
  name: string;
  visible: boolean;
  collapsed: boolean;
  assets: ExperienceAsset[];
};

export type ExperienceSurface = {
  id: string;
  name: string;
  kind: ExperienceSurfaceKind;
  geometry: ExperienceSurfaceGeometry;
  points: ExperiencePoint[];
  guideLayerIds: string[];
};

export type ExperienceSection = {
  id: string;
  name: string;
  description: string;
  background: string;
  focus: ExperiencePoint;
  surfaces?: ExperienceSurface[];
  layers: ExperienceLayer[];
};

export type ExperienceDocument = {
  schemaVersion: typeof EXPERIENCE_SCHEMA_VERSION;
  bundledAssetRevision?: number;
  id: string;
  slug: string;
  title: string;
  description: string;
  stage: {
    width: number;
    height: number;
    background: string;
  };
  settings: {
    transition: 'cut' | 'crossfade';
    showProgress: boolean;
  };
  assetGroups: ExperienceAssetGroup[];
  sections: ExperienceSection[];
};

export type InteractiveExperienceRecord = {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  draft: ExperienceDocument;
  published: ExperienceDocument | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export const createStableId = (prefix: string) => {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${random}`;
};

export const createTransform = (patch: Partial<LayerTransform> = {}): LayerTransform => ({
  x: 640,
  y: 360,
  width: 640,
  height: 360,
  rotation: 0,
  skewX: 0,
  skewY: 0,
  ...patch,
});

type AssetGeometry = Partial<Pick<ExperienceAsset, 'id' | 'source' | 'width' | 'height'>>;

const isBuiltInWoodStructure = (asset: AssetGeometry | null | undefined) => (
  asset?.id === 'asset-wood-structure-no-led'
  || asset?.source?.split('?')[0].endsWith('/assets/interactive/wood-structure-no-led.png')
);

export type AssetVisibleViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
};

export const assetVisibleViewBox = (
  asset: AssetGeometry | null | undefined,
): AssetVisibleViewBox | null => {
  if (!isBuiltInWoodStructure(asset)) return null;
  return {
    x: 8,
    y: 8,
    width: 1580,
    height: 831,
    sourceWidth: 1596,
    sourceHeight: 847,
  };
};

export const assetAspectRatio = (asset: AssetGeometry | null | undefined) => {
  const visibleViewBox = assetVisibleViewBox(asset);
  if (visibleViewBox) return visibleViewBox.width / visibleViewBox.height;
  if (asset?.width && asset?.height && asset.width > 0 && asset.height > 0) {
    return asset.width / asset.height;
  }
  return 5 / 4;
};

export const assetRenderSource = (asset: ExperienceAsset) => {
  if (!isBuiltInWoodStructure(asset)) return asset.source;
  return `${asset.source.split('?')[0]}?v=wood-structure-cropped-2`;
};

export const createSection = (name = 'Untitled frame'): ExperienceSection => ({
  id: createStableId('section'),
  name,
  description: '',
  background: '#e9e6df',
  focus: {x: DEFAULT_STAGE_WIDTH / 2, y: DEFAULT_STAGE_HEIGHT / 2},
  surfaces: [],
  layers: [],
});

export const createDocument = (slug: string, title: string): ExperienceDocument => ({
  schemaVersion: EXPERIENCE_SCHEMA_VERSION,
  id: createStableId('experience'),
  slug,
  title,
  description: '',
  stage: {
    width: DEFAULT_STAGE_WIDTH,
    height: DEFAULT_STAGE_HEIGHT,
    background: '#101820',
  },
  settings: {
    transition: 'cut',
    showProgress: true,
  },
  assetGroups: [],
  sections: [createSection('Opening frame')],
});

export const cloneLayer = (layer: ExperienceLayer): ExperienceLayer => ({
  ...layer,
  id: createStableId('layer'),
  transform: {...layer.transform},
  points: layer.points?.map(point => ({...point})),
  parametric: layer.parametric ? {...layer.parametric} : undefined,
});

export const cloneSection = (section: ExperienceSection): ExperienceSection => {
  const routeIds = new Map<string, string>();
  const layers = section.layers.map(layer => {
    const next = cloneLayer(layer);
    if (next.parametric?.routeId) {
      const nextRouteId = routeIds.get(next.parametric.routeId) || createStableId('route');
      routeIds.set(next.parametric.routeId, nextRouteId);
      next.parametric = {...next.parametric, routeId: nextRouteId};
    }
    return next;
  });
  return {
    ...section,
    id: createStableId('section'),
    name: `${section.name} copy`,
    focus: {...section.focus},
    surfaces: section.surfaces?.map(surface => ({
      ...surface,
      points: surface.points.map(point => ({...point})),
      guideLayerIds: [...surface.guideLayerIds],
    })),
    layers,
  };
};

export const findAsset = (document: ExperienceDocument, assetId: string | undefined) => {
  if (!assetId) return null;
  for (const group of document.assetGroups) {
    if (!group.visible) continue;
    const asset = group.assets.find(item => item.id === assetId);
    if (asset) return asset;
  }
  return null;
};

export const normalizeDrawing = (points: ExperiencePoint[]) => {
  if (!points.length) return {transform: createTransform({x: 0, y: 0, width: 1, height: 1}), points: []};
  const minX = Math.min(...points.map(point => point.x));
  const minY = Math.min(...points.map(point => point.y));
  const maxX = Math.max(...points.map(point => point.x));
  const maxY = Math.max(...points.map(point => point.y));
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  return {
    transform: createTransform({x: minX, y: minY, width, height}),
    points: points.map(point => ({
      x: (point.x - minX) / width,
      y: (point.y - minY) / height,
    })),
  };
};
