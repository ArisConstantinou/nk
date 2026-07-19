import {useEffect, useRef, useState} from 'react';
import {
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Copy,
  Expand,
  Eye,
  ExternalLink,
  Focus,
  History,
  ImageDown,
  Layers3,
  Library,
  MoreHorizontal,
  MousePointer2,
  MoveDown,
  MoveUp,
  Pencil,
  Redo2,
  Save,
  Send,
  Shapes,
  Square,
  Type,
  Undo2,
} from 'lucide-react';
import {useHref} from 'react-router-dom';
import {AdminError, AdminLoading, PageHeading} from '../components/AdminStates';
import {ExperiencePresentation} from '../../interactive/engine/ExperiencePresentation';
import {getEffectiveRouteBendRadiusMm, getMinimumWallChaseBendRadiusMm} from '../../interactive/engine/ExperienceStage';
import {
  assetAspectRatio,
  createStableId,
  createTransform,
  DEFAULT_ROUTE_BEND_RADIUS_MM,
  type ExperienceAsset,
  type ExperienceDocument,
  type ExperienceLayer,
  type ExperienceSurface,
  type ExperienceTool,
  type WallChaseStyle,
} from '../../interactive/engine/schema';
import {electricalInstallationTemplate} from '../../interactive/templates/electricalInstallation';
import {AssetManager} from '../../interactive/studio/AssetManager';
import {copyAiPrompt, exportSectionPng, exportSectionSvg} from '../../interactive/studio/exportMockup';
import {SectionPanel, LayerPanel} from '../../interactive/studio/StudioPanels';
import {StudioStage} from '../../interactive/studio/StudioStage';
import {SurfaceManager} from '../../interactive/studio/SurfaceManager';
import {useInteractiveDraft, type InteractiveHistoryOptions} from '../../interactive/studio/useInteractiveDraft';
import {createElectricalRoutePair} from '../../interactive/parametric/electricalRoute';
import {traceLineImageRoutes} from '../../interactive/parametric/traceBlueprintRoutes';
import {
  createThreeLineRoomGuides,
  detectRoomSurfaces,
  fitTransformToSurface,
  synchronizeCalibratedSurfaces,
} from '../../interactive/surfaces/roomSurfaceCalibration';
import {isPagesAdminMode} from '../pagesMode';
import {useAdminLanguage} from '../i18n/AdminLanguage';
import './interactive-studio.css';

const tools: Array<{id: ExperienceTool; label: string; shortcut: string; icon: typeof MousePointer2}> = [
  {id: 'select', label: 'Select', shortcut: 'V', icon: MousePointer2},
  {id: 'freehand', label: 'Freehand', shortcut: 'P', icon: Pencil},
  {id: 'rectangle', label: 'Rectangle', shortcut: 'R', icon: Square},
  {id: 'ellipse', label: 'Circle', shortcut: 'O', icon: Circle},
  {id: 'line', label: 'Line', shortcut: 'L', icon: ArrowDownToLine},
  {id: 'arrow', label: 'Arrow', shortcut: 'A', icon: ArrowUpRight},
  {id: 'text', label: 'Text', shortcut: 'T', icon: Type},
];
const drawingTools = tools.filter(item => item.id !== 'select');

const frameBackgroundDescription = 'Frame background asset.';
const wideWallFixtureFit = {widthCoverage: 1, heightCoverage: 1, marginScale: 0} as const;
const surfaceFitOptionsForAsset = (assetId?: string) => (
  assetId === 'asset-wood-structure-no-led' ? wideWallFixtureFit : undefined
);
const calibrationGuideNames = {
  'wall-corner': 'Calibration · wall corner',
  'wall-floor': 'Calibration · wall/floor',
  'floor-depth': 'Calibration · floor depth',
} as const;

const updateSection = (document: ExperienceDocument, sectionId: string, change: (section: ExperienceDocument['sections'][number]) => ExperienceDocument['sections'][number]) => ({
  ...document,
  sections: document.sections.map(section => section.id === sectionId ? change(section) : section),
});

export function InteractiveStudioPage() {
  const {text} = useAdminLanguage();
  const publicEngineHref = useHref('/interactive/electrical-installations/engine');
  const studio = useInteractiveDraft('electrical-installations', electricalInstallationTemplate);
  const [activeSectionId, setActiveSectionId] = useState(electricalInstallationTemplate.sections[0].id);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [tool, setTool] = useState<ExperienceTool>('select');
  const [preview, setPreview] = useState(false);
  const [focus, setFocus] = useState(true);
  const [copyStatus, setCopyStatus] = useState('');
  const [mobilePanel, setMobilePanel] = useState<'canvas' | 'sections' | 'assets'>('canvas');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyScope, setHistoryScope] = useState<'all' | 'selected'>('all');
  const [toolbarMenu, setToolbarMenu] = useState<'draw' | 'view' | 'export' | 'project' | null>(null);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);
  const [selectedSurfaceId, setSelectedSurfaceId] = useState<string | null>(null);
  const [surfaceMessage, setSurfaceMessage] = useState('');
  const [zoomControlsHost, setZoomControlsHost] = useState<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLElement>(null);

  const document = studio.document;
  const activeSection = document.sections.find(section => section.id === activeSectionId) || document.sections[0];
  const selectedLayerId = selectedLayerIds[selectedLayerIds.length - 1] ?? null;
  const selectedLayer = activeSection?.layers.find(layer => layer.id === selectedLayerId) || null;
  const selectedPartNumber = selectedLayer && activeSection
    ? activeSection.layers.findIndex(layer => layer.id === selectedLayer.id) + 1
    : 0;
  const selectedLayerPlace = selectedLayer && activeSection
    ? activeSection.surfaces?.find(surface => surface.id === selectedLayer.surfaceId) || null
    : null;
  const selectedPlaceNumber = selectedLayerPlace && activeSection?.surfaces
    ? activeSection.surfaces.findIndex(surface => surface.id === selectedLayerPlace.id) + 1
    : 0;
  const activeSurface = activeSection?.surfaces?.find(surface => surface.id === selectedSurfaceId) || null;
  const selectedLayerSurface = activeSection?.surfaces?.find(surface => surface.id === selectedLayer?.surfaceId) || null;
  const selectedGuideCount = selectedLayerIds.filter(id => {
    const layer = activeSection?.layers.find(item => item.id === id);
    return layer?.type === 'line' || layer?.type === 'path';
  }).length;
  const guideCount = activeSection?.layers.filter(layer => Boolean(layer.calibrationRole)).length || 0;
  const selectedRouteChannel = selectedLayer?.parametric
      ? activeSection.layers.find(layer => (
        layer.parametric?.routeId === selectedLayer.parametric?.routeId
        && layer.parametric?.renderer === 'wall-channel'
      )) || null
    : null;
  const selectedRequestedBendRadiusMm = selectedLayer?.parametric?.bendRadiusMm ?? DEFAULT_ROUTE_BEND_RADIUS_MM;
  const selectedMinimumBendRadiusMm = selectedRouteChannel
    ? getMinimumWallChaseBendRadiusMm(selectedRouteChannel)
    : 0;
  const selectedEffectiveBendRadiusMm = selectedLayer?.parametric && activeSection
    ? getEffectiveRouteBendRadiusMm(activeSection, selectedLayer)
    : selectedRequestedBendRadiusMm;
  const selectedHistoryIds = [...new Set(selectedLayerIds.flatMap(id => {
    const layer = activeSection?.layers.find(item => item.id === id);
    return layer?.parametric?.routeId
      ? activeSection.layers.filter(item => item.parametric?.routeId === layer.parametric?.routeId).map(item => item.id)
      : layer ? [layer.id] : [];
  }))];
  const visibleHistory = historyScope === 'selected'
    ? studio.history.filter(entry => entry.objectIds.some(id => selectedHistoryIds.includes(id)))
    : studio.history;
  const activeDrawingTool = drawingTools.find(item => item.id === tool);
  const ActiveDrawingIcon = activeDrawingTool?.icon || Shapes;
  const viewLabel = fullscreenActive ? 'Fullscreen' : focus ? 'Focus' : 'Page';

  useEffect(() => {
    if (!document.sections.some(section => section.id === activeSectionId)) {
      setActiveSectionId(document.sections[0]?.id || '');
      setSelectedLayerIds([]);
    }
  }, [activeSectionId, document.sections]);

  useEffect(() => {
    if (selectedSurfaceId && !activeSection?.surfaces?.some(surface => surface.id === selectedSurfaceId)) {
      setSelectedSurfaceId(null);
    }
  }, [activeSection?.id, activeSection?.surfaces, selectedSurfaceId]);

  useEffect(() => {
    if (!surfaceMessage) return undefined;
    const timeout = globalThis.setTimeout(() => setSurfaceMessage(''), 3200);
    return () => globalThis.clearTimeout(timeout);
  }, [surfaceMessage]);

  useEffect(() => {
    if (!focus) return;
    const previousOverflow = globalThis.document.body.style.overflow;
    globalThis.document.body.style.overflow = 'hidden';
    return () => {
      globalThis.document.body.style.overflow = previousOverflow;
    };
  }, [focus]);

  useEffect(() => {
    const handleToolShortcut = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        setTool('select');
        setToolbarMenu(null);
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)) return;
      const nextTool = tools.find(item => item.shortcut.toLowerCase() === event.key.toLowerCase());
      if (!nextTool) return;
      event.preventDefault();
      if (nextTool.id !== 'select') setSelectedLayerIds([]);
      setTool(nextTool.id);
      setToolbarMenu(null);
    };
    globalThis.addEventListener('keydown', handleToolShortcut, true);
    return () => globalThis.removeEventListener('keydown', handleToolShortcut, true);
  }, []);

  useEffect(() => {
    const handleFullscreen = () => setFullscreenActive(Boolean(globalThis.document.fullscreenElement));
    globalThis.document.addEventListener('fullscreenchange', handleFullscreen);
    return () => globalThis.document.removeEventListener('fullscreenchange', handleFullscreen);
  }, []);

  useEffect(() => {
    if (!toolbarMenu) return;
    const closeMenus = (event: globalThis.PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('.ix-toolbar-menu')) return;
      setToolbarMenu(null);
    };
    globalThis.document.addEventListener('pointerdown', closeMenus, true);
    return () => globalThis.document.removeEventListener('pointerdown', closeMenus, true);
  }, [toolbarMenu]);

  useEffect(() => {
    const handleHistoryShortcut = (event: globalThis.KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== 'z' && key !== 'y') return;
      const wantsRedo = key === 'y' || event.shiftKey;
      if (wantsRedo ? !studio.canRedo : !studio.canUndo) return;
      event.preventDefault();
      event.stopPropagation();
      if (wantsRedo) studio.redo();
      else studio.undo();
    };
    globalThis.addEventListener('keydown', handleHistoryShortcut, true);
    return () => globalThis.removeEventListener('keydown', handleHistoryShortcut, true);
  }, [studio.canRedo, studio.canUndo, studio.redo, studio.undo]);

  if (studio.phase === 'loading') return <AdminLoading label={isPagesAdminMode ? 'Loading interactive device workspace…' : 'Loading secure interactive draft…'}/>;
  if (studio.phase === 'error' && !studio.record) return <AdminError message={studio.message} retry={() => window.location.reload()}/>;
  if (!activeSection) return <AdminError message="The draft does not contain a valid frame." retry={() => window.location.reload()}/>;

  const change = studio.setDocument;
  const changeActiveLayers = (layers: ExperienceLayer[], historyOptions?: InteractiveHistoryOptions) => (
    change(updateSection(document, activeSection.id, section => (
      synchronizeCalibratedSurfaces({...section, layers}, document.stage)
    )), historyOptions)
  );
  const addLayer = (layer: ExperienceLayer, options: {preserveTool?: boolean; select?: boolean} = {}) => {
    changeActiveLayers([...activeSection.layers, layer], {
      label: `Add ${layer.name}`,
      objectIds: [layer.id],
    });
    setSelectedLayerIds(options.select === false ? [] : [layer.id]);
    if (!options.preserveTool) setTool('select');
  };
  const updateLayer = (id: string, patch: Partial<ExperienceLayer>) => {
    const source = activeSection.layers.find(layer => layer.id === id);
    const routeId = source?.parametric?.routeId;
    const sharesRouteGeometry = Boolean(routeId && (patch.transform || patch.points || 'surfaceId' in patch));
    const objectIds = routeId
      ? activeSection.layers.filter(layer => layer.parametric?.routeId === routeId).map(layer => layer.id)
      : [id];
    const property = patch.points ? 'route' : patch.transform ? 'position' : 'properties';
    changeActiveLayers(activeSection.layers.map(layer => {
      if (layer.id === id) return {...layer, ...patch};
      if (sharesRouteGeometry && layer.parametric?.routeId === routeId) {
        return {
          ...layer,
          ...(patch.transform ? {transform: {...patch.transform}} : {}),
          ...(patch.points ? {points: patch.points.map(point => ({...point}))} : {}),
          ...('surfaceId' in patch ? {surfaceId: patch.surfaceId} : {}),
        };
      }
      return layer;
    }), {
      label: `${patch.points ? 'Edit' : 'Update'} ${source?.name || 'layer'} ${property}`,
      objectIds,
      coalesceKey: `${routeId || id}:${property}`,
    });
  };
  const updateLayers = (updates: Array<{id: string; patch: Partial<ExperienceLayer>}>) => {
    if (!updates.length) return;
    const patches = new Map(updates.map(update => [update.id, update.patch]));
    const routePatches = new Map<string, Partial<ExperienceLayer>>();
    const objectIds = new Set<string>();
    updates.forEach(update => {
      objectIds.add(update.id);
      const source = activeSection.layers.find(layer => layer.id === update.id);
      if (source?.parametric?.routeId && (update.patch.transform || update.patch.points)) {
        routePatches.set(source.parametric.routeId, update.patch);
        activeSection.layers
          .filter(layer => layer.parametric?.routeId === source.parametric?.routeId)
          .forEach(layer => objectIds.add(layer.id));
      }
    });
    const nextLayers = activeSection.layers.map(layer => {
      const patch = patches.get(layer.id) || (layer.parametric?.routeId ? routePatches.get(layer.parametric.routeId) : undefined);
      if (!patch) return layer;
      return {
        ...layer,
        ...patch,
        ...(patch.transform ? {transform: {...patch.transform}} : {}),
        ...(patch.points ? {points: patch.points.map(point => ({...point}))} : {}),
      };
    });
    changeActiveLayers(nextLayers, {
      label: updates.length === 1 ? `Move ${activeSection.layers.find(layer => layer.id === updates[0].id)?.name || 'layer'}` : `Move ${updates.length} selected layers`,
      objectIds: [...objectIds],
      coalesceKey: `group-move:${[...objectIds].sort().join(',')}`,
    });
  };
  const removeLayers = (ids: string[]) => {
    if (!ids.length) return;
    const idSet = new Set(ids);
    changeActiveLayers(activeSection.layers.filter(item => !idSet.has(item.id)), {
      label: ids.length === 1
        ? `Remove ${activeSection.layers.find(item => item.id === ids[0])?.name || 'layer'}`
        : `Remove ${ids.length} selected layers`,
      objectIds: ids,
    });
    setSelectedLayerIds(current => current.filter(id => !idSet.has(id)));
  };
  const addCalibrationGuides = () => {
    const guides = createThreeLineRoomGuides(document.stage);
    const nextLayers = [...activeSection.layers, ...guides];
    const detection = detectRoomSurfaces({
      layers: nextLayers,
      stage: document.stage,
      selectedLayerIds: guides.map(guide => guide.id),
      existingSurfaces: activeSection.surfaces || [],
    });
    change(updateSection(document, activeSection.id, section => ({
      ...section,
      layers: nextLayers,
      surfaces: detection.surfaces,
    })), {
      label: 'Add three-line room calibration',
      objectIds: guides.map(guide => guide.id),
    });
    setSelectedLayerIds([]);
    setSelectedSurfaceId(detection.surfaces[0]?.id || null);
    setSurfaceMessage(`${detection.message} Drag a coloured guide to refine the room.`);
    setTool('select');
  };
  const detectSurfaces = () => {
    const detection = detectRoomSurfaces({
      layers: activeSection.layers,
      stage: document.stage,
      selectedLayerIds,
      existingSurfaces: activeSection.surfaces || [],
    });
    setSurfaceMessage(detection.message);
    if (!detection.surfaces.length) return;
    const nextLayers = activeSection.layers.map(layer => {
      const calibrationRole = detection.guideRoles.get(layer.id);
      if (!calibrationRole) return layer;
      return {
        ...layer,
        calibrationRole,
        name: layer.name === 'Line mockup' || layer.name === 'Freehand mockup'
          ? calibrationGuideNames[calibrationRole]
          : layer.name,
      };
    });
    change(updateSection(document, activeSection.id, section => ({
      ...section,
      layers: nextLayers,
      surfaces: detection.surfaces,
    })), {
      label: 'Detect calibrated room surfaces',
      objectIds: detection.guideLayerIds,
    });
    setSelectedLayerIds([]);
    setSelectedSurfaceId(detection.surfaces[0]?.id || null);
    setTool('select');
  };
  const updateSurface = (surfaceId: string, patch: Partial<ExperienceSurface>) => {
    change(updateSection(document, activeSection.id, section => ({
      ...section,
      surfaces: (section.surfaces || []).map(surface => surface.id === surfaceId ? {...surface, ...patch} : surface),
    })), {
      label: `Update ${activeSection.surfaces?.find(surface => surface.id === surfaceId)?.name || 'surface'}`,
      objectIds: [surfaceId],
      coalesceKey: `${surfaceId}:properties`,
    });
  };
  const clearCalibration = () => {
    const guideIds = activeSection.layers.filter(layer => layer.calibrationRole).map(layer => layer.id);
    const surfaceIds = new Set((activeSection.surfaces || []).map(surface => surface.id));
    change(updateSection(document, activeSection.id, section => ({
      ...section,
      surfaces: [],
      layers: section.layers.map(layer => ({
        ...layer,
        calibrationRole: undefined,
        surfaceId: layer.surfaceId && surfaceIds.has(layer.surfaceId) ? undefined : layer.surfaceId,
      })),
    })), {
      label: 'Clear room surface calibration',
      objectIds: guideIds,
    });
    setSelectedSurfaceId(null);
    setSurfaceMessage('Calibration cleared. The original lines remain editable.');
  };
  const applyAsset = (asset: ExperienceAsset, placement: 'object' | 'background' = 'object') => {
    const width = 600;
    const freeTransform = createTransform({x: 660, y: 300, width, height: width / assetAspectRatio(asset)});
    const fixtureSurface = asset.id === 'asset-wood-structure-no-led'
      ? activeSection.surfaces?.find(surface => surface.id === 'surface-main-wall')
      : null;
    const layer: ExperienceLayer = {
      id: createStableId('layer'),
      name: placement === 'background' ? `${asset.name} · background` : asset.name,
      type: 'asset',
      assetId: asset.id,
      assetFit: placement === 'background' ? 'cover' : 'contain',
      visible: true,
      locked: placement === 'background',
      opacity: 1,
      transform: placement === 'background'
        ? createTransform({x: 0, y: 0, width: document.stage.width, height: document.stage.height})
        : fixtureSurface
          ? fitTransformToSurface(fixtureSurface, freeTransform, undefined, surfaceFitOptionsForAsset(asset.id))
          : freeTransform,
      surfaceId: placement === 'object' ? fixtureSurface?.id : undefined,
      description: placement === 'background' ? frameBackgroundDescription : undefined,
    };
    if (placement === 'background') {
      const previousBackgroundIds = activeSection.layers
        .filter(item => item.description === frameBackgroundDescription)
        .map(item => item.id);
      const layersWithoutPreviousBackground = activeSection.layers
        .filter(item => item.description !== frameBackgroundDescription);
      const roomBaseNames = new Set(['Fixed wall background', 'Finished floor datum', 'Room corner datum']);
      const lastRoomBaseIndex = layersWithoutPreviousBackground.reduce(
        (lastIndex, item, index) => roomBaseNames.has(item.name) ? index : lastIndex,
        -1,
      );
      const nextLayers = [...layersWithoutPreviousBackground];
      nextLayers.splice(lastRoomBaseIndex + 1, 0, layer);
      changeActiveLayers(nextLayers, {
        label: `Set ${asset.name} as frame background`,
        objectIds: [layer.id, ...previousBackgroundIds],
      });
      setSelectedLayerIds([]);
      setTool('select');
      return;
    }
    addLayer(layer);
  };
  const addParametricRoute = () => {
    const pair = createElectricalRoutePair({name: `Route ${activeSection.layers.filter(layer => layer.type === 'parametric-path').length / 2 + 1}`});
    changeActiveLayers([...activeSection.layers, ...pair], {
      label: 'Add wall channel and conduit',
      objectIds: pair.map(layer => layer.id),
    });
    setSelectedLayerIds([pair[0].id]);
    setTool('select');
    setMobilePanel('canvas');
  };
  const traceAssetRoutes = async (asset: ExperienceAsset, targetGroupId?: string) => {
    const trace = await traceLineImageRoutes(asset.source);
    const knownAsset = document.assetGroups.flatMap(group => group.assets).find(item => item.id === asset.id || item.source === asset.source);
    const routeAsset = knownAsset || asset;
    const existingBlueprint = activeSection.layers.find(layer => layer.type === 'asset' && layer.assetId === routeAsset.id);
    const stageWidth = document.stage.width;
    const stageHeight = document.stage.height;
    const fitScale = Math.min(stageWidth / trace.sourceWidth, stageHeight / trace.sourceHeight);
    const fittedWidth = trace.sourceWidth * fitScale;
    const fittedHeight = trace.sourceHeight * fitScale;
    const blueprintTransform = existingBlueprint?.transform || createTransform({
      x: (stageWidth - fittedWidth) / 2,
      y: (stageHeight - fittedHeight) / 2,
      width: fittedWidth,
      height: fittedHeight,
    });
    const blueprintLayer: ExperienceLayer | null = existingBlueprint ? null : {
      id: createStableId('layer'),
      name: `Blueprint - ${routeAsset.name}`,
      type: 'asset',
      assetId: routeAsset.id,
      visible: true,
      locked: true,
      opacity: 1,
      transform: {...blueprintTransform},
      description: 'Source blueprint used for local guide-line tracing.',
    };
    const traceNamePrefix = `${routeAsset.name} route `;
    const traceSourceMarker = `Auto-traced from asset ${routeAsset.id}.`;
    const replacedRouteLayers = activeSection.layers.filter(layer => (
      layer.type === 'parametric-path'
      && (layer.description?.includes(traceSourceMarker) || layer.name.startsWith(traceNamePrefix))
    ));
    const routeLayers = trace.paths.flatMap((points, index) => createElectricalRoutePair({
      name: `${traceNamePrefix}${index + 1}`,
      transform: blueprintTransform,
      points,
    }).map(layer => ({
      ...layer,
      description: `${layer.description || ''} ${traceSourceMarker}`.trim(),
    })));
    const nextLayers = [
      ...activeSection.layers.filter(layer => !replacedRouteLayers.includes(layer)),
      ...(blueprintLayer ? [blueprintLayer] : []),
      ...routeLayers,
    ];
    const nextAssetGroups = knownAsset || !targetGroupId
      ? document.assetGroups
      : document.assetGroups.map(group => group.id === targetGroupId ? {...group, assets: [...group.assets, routeAsset]} : group);
    change({
      ...document,
      assetGroups: nextAssetGroups,
      sections: document.sections.map(section => section.id === activeSection.id ? {...section, layers: nextLayers} : section),
    }, {
      label: `${replacedRouteLayers.length ? 'Re-trace' : 'Auto-trace'} ${routeAsset.name}`,
      objectIds: [...replacedRouteLayers, ...routeLayers].map(layer => layer.id),
    });
    setSelectedLayerIds(routeLayers[0]?.id ? [routeLayers[0].id] : []);
    setTool('select');
    setMobilePanel('canvas');
    return trace.paths.length;
  };
  const setRouteVisibility = (mode: 'channel' | 'conduit' | 'both') => {
    const routeId = selectedLayer?.parametric?.routeId;
    if (!routeId) return;
    const objectIds = activeSection.layers.filter(layer => layer.parametric?.routeId === routeId).map(layer => layer.id);
    changeActiveLayers(activeSection.layers.map(layer => layer.parametric?.routeId === routeId
      ? {...layer, visible: mode === 'both' || layer.parametric.renderer === (mode === 'channel' ? 'wall-channel' : 'flex-conduit')}
      : layer), {
      label: `Show ${mode} for ${selectedLayer.name}`,
      objectIds,
    });
  };
  const updateParametric = (patch: Partial<NonNullable<ExperienceLayer['parametric']>>) => {
    if (!selectedLayer?.parametric) return;
    if (patch.bendRadiusMm !== undefined) {
      const routeId = selectedLayer.parametric.routeId;
      const objectIds = activeSection.layers.filter(layer => layer.parametric?.routeId === routeId).map(layer => layer.id);
      changeActiveLayers(activeSection.layers.map(layer => layer.parametric?.routeId === routeId
        ? {...layer, parametric: {...layer.parametric, bendRadiusMm: patch.bendRadiusMm}}
        : layer), {
        label: `Change bend radius for ${selectedLayer.name}`,
        objectIds,
        coalesceKey: `${routeId}:bend-radius`,
      });
      return;
    }
    updateLayer(selectedLayer.id, {parametric: {...selectedLayer.parametric, ...patch}});
  };
  const setRouteChaseStyle = (chaseStyle: WallChaseStyle) => {
    if (!selectedRouteChannel?.parametric) return;
    const roughness = chaseStyle === 'hand-broken' ? .82 : .08;
    changeActiveLayers(activeSection.layers.map(layer => layer.id === selectedRouteChannel.id
      ? {...layer, parametric: {...layer.parametric!, chaseStyle, roughness}}
      : layer), {
      label: `Use ${chaseStyle === 'hand-broken' ? 'hand-broken' : 'machine-cut'} chase for ${selectedRouteChannel.name}`,
      objectIds: [selectedRouteChannel.id],
    });
  };
  const setRouteChannelWidth = (value: number) => {
    if (!selectedRouteChannel?.parametric || !Number.isFinite(value)) return;
    const widthMm = Math.max(20, Math.min(160, Math.round(value * 10) / 10));
    updateLayer(selectedRouteChannel.id, {
      parametric: {...selectedRouteChannel.parametric, widthMm},
    });
  };
  const reorderSelected = (direction: -1 | 1) => {
    if (!selectedLayer) return;
    const layers = [...activeSection.layers];
    const index = layers.findIndex(layer => layer.id === selectedLayer.id);
    const target = Math.max(0, Math.min(layers.length - 1, index + direction));
    if (target === index) return;
    const [moved] = layers.splice(index, 1);
    layers.splice(target, 0, moved);
    changeActiveLayers(layers, {
      label: `Reorder ${selectedLayer.name}`,
      objectIds: [selectedLayer.id],
    });
  };
  const fullscreen = async () => {
    if (!globalThis.document.fullscreenElement) await rootRef.current?.requestFullscreen();
    else await globalThis.document.exitFullscreen();
  };
  const copyPrompt = async () => {
    try {
      await copyAiPrompt(document, activeSection);
      setCopyStatus('AI prompt copied');
    } catch {
      setCopyStatus('Clipboard unavailable');
    }
    window.setTimeout(() => setCopyStatus(''), 2200);
  };
  const beginLayerInteraction = (layer: ExperienceLayer, kind: 'move' | 'resize' | 'rotate' | 'skew' | 'point', layerIds: string[] = [layer.id]) => {
    const routeId = layer.parametric?.routeId;
    const objectIds = [...new Set(layerIds.flatMap(id => {
      const selectedItem = activeSection.layers.find(item => item.id === id);
      return selectedItem?.parametric?.routeId
        ? activeSection.layers.filter(item => item.parametric?.routeId === selectedItem.parametric?.routeId).map(item => item.id)
        : [id];
    }))];
    const action = kind === 'point' ? 'Edit route point' : `${kind.charAt(0).toUpperCase()}${kind.slice(1)}`;
    studio.beginHistory({
      label: layerIds.length > 1 ? `${action} ${layerIds.length} selected layers` : `${action} ${layer.name}`,
      objectIds,
      coalesceKey: `${routeId || objectIds.sort().join(',')}:${kind}`,
    });
  };

  if (preview) return <ExperiencePresentation document={document} editingPreview onExitPreview={() => setPreview(false)}/>;

  return <>
  <PageHeading
    eyebrow={text('INTERACTIVE EXPERIENCE ENGINE', 'ΜΗΧΑΝΗ ΔΙΑΔΡΑΣΤΙΚΩΝ ΕΜΠΕΙΡΙΩΝ')}
    title={text('Interactive Studio', 'Interactive Studio')}
    description={text(
      'Build reusable frame-by-frame experiences on one fixed 1920 × 1080 stage, with independent layers, asset groups and a live preview.',
      'Δημιουργήστε επαναχρησιμοποιήσιμες εμπειρίες frame-by-frame σε σταθερή σκηνή 1920 × 1080, με ανεξάρτητα layers, ομάδες assets και live preview.',
    )}
  />
  <section ref={rootRef} className={`ix-studio ${focus ? 'ix-studio--focus' : ''}`}>
    <header className="ix-studio__header">
      <div>
        <span>INTERACTIVE ENGINE / TEMPLATE</span>
        <input value={document.title} onChange={event => change({...document, title: event.target.value})} aria-label="Interactive experience title"/>
        <small>{isPagesAdminMode ? 'Device workspace · ' : ''}Generic 1920×1080 frame document · electrical demo data only</small>
      </div>
      <div className="ix-studio__save-actions">
        <span className={`ix-save-state ix-save-state--${studio.phase}`} aria-live="polite">{studio.dirty ? '● ' : '✓ '}{studio.message}</span>
        <a className="ix-studio__public-link" href={publicEngineHref} target="_blank" rel="noreferrer"><ExternalLink/>Public read-only</a>
        <button type="button" onClick={() => void studio.save()} disabled={!studio.record || studio.phase === 'saving' || studio.phase === 'publishing'}><Save/>Save draft</button>
        <button type="button" onClick={() => void studio.publish()} disabled={!studio.record || studio.phase === 'saving' || studio.phase === 'publishing'}><Send/>Publish</button>
        <button className="primary" type="button" onClick={() => setPreview(true)}><Eye/>Done / Preview</button>
      </div>
    </header>

    <div className="ix-studio__toolbar" role="toolbar" aria-label="Interactive Studio tools">
      <div className="ix-tool-group ix-tool-group--primary">
        <div className={`ix-toolbar-menu ${toolbarMenu === 'draw' ? 'is-open' : ''}`}>
          <button
            type="button"
            className={activeDrawingTool ? 'active' : ''}
            onClick={() => setToolbarMenu(current => current === 'draw' ? null : 'draw')}
            aria-label={activeDrawingTool ? `${activeDrawingTool.label} tool` : 'Open drawing tools'}
            aria-haspopup="menu"
            aria-expanded={toolbarMenu === 'draw'}
            aria-pressed={Boolean(activeDrawingTool)}
          >
            <ActiveDrawingIcon/>
            <span>{activeDrawingTool?.label || 'Add'}</span>
            <ChevronDown className="ix-toolbar-menu__chevron"/>
          </button>
          {toolbarMenu === 'draw' && <div className="ix-toolbar-popover ix-toolbar-popover--tools" role="menu" aria-label="Drawing tools">
            <header><b>Add to canvas</b><small>Tap the active tool again or press Esc to finish</small></header>
            <div>
              {drawingTools.map(item => {
                const Icon = item.icon;
                return <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className={tool === item.id ? 'active' : ''}
                  onClick={() => {
                    const nextTool = tool === item.id ? 'select' : item.id;
                    if (nextTool !== 'select') setSelectedLayerIds([]);
                    setTool(nextTool);
                    setToolbarMenu(null);
                  }}
                >
                  <Icon/><span>{item.label}</span><kbd>{item.shortcut}</kbd>
                </button>;
              })}
            </div>
          </div>}
        </div>
      </div>

      <div className="ix-tool-group ix-tool-group--secondary">
        <div className={`ix-toolbar-menu ${toolbarMenu === 'view' ? 'is-open' : ''}`}>
          <button type="button" onClick={() => setToolbarMenu(current => current === 'view' ? null : 'view')} aria-label={`View mode: ${viewLabel}`} aria-haspopup="menu" aria-expanded={toolbarMenu === 'view'}>
            {fullscreenActive ? <Expand/> : focus ? <Focus/> : <Square/>}<span>View: {viewLabel}</span><ChevronDown className="ix-toolbar-menu__chevron"/>
          </button>
          {toolbarMenu === 'view' && <div className="ix-toolbar-popover ix-toolbar-popover--list" role="menu" aria-label="Viewport mode">
            <header><b>Viewport</b><small>Choose how much UI stays visible</small></header>
            <button type="button" role="menuitem" className={!focus && !fullscreenActive ? 'active' : ''} onClick={() => {setFocus(false); setToolbarMenu(null);}}>
              <Square/><span><b>Page</b><small>Studio inside the admin page</small></span>
            </button>
            <button type="button" role="menuitem" className={focus && !fullscreenActive ? 'active' : ''} onClick={() => {setFocus(true); setToolbarMenu(null);}}>
              <Focus/><span><b>Focus</b><small>Use the full browser workspace</small></span>
            </button>
            <button type="button" role="menuitem" className={fullscreenActive ? 'active' : ''} onClick={() => {setToolbarMenu(null); void fullscreen();}}>
              <Expand/><span><b>Fullscreen</b><small>Hide browser chrome</small></span>
            </button>
          </div>}
        </div>

        <div className={`ix-toolbar-menu ${toolbarMenu === 'export' ? 'is-open' : ''}`}>
          <button type="button" onClick={() => setToolbarMenu(current => current === 'export' ? null : 'export')} aria-label="Export current frame" aria-haspopup="menu" aria-expanded={toolbarMenu === 'export'}>
            <ArrowDownToLine/><span>Export</span><ChevronDown className="ix-toolbar-menu__chevron"/>
          </button>
          {toolbarMenu === 'export' && <div className="ix-toolbar-popover ix-toolbar-popover--list ix-toolbar-popover--align-right" role="menu" aria-label="Export options">
            <header><b>Export frame</b><small>Current frame only</small></header>
            <button type="button" role="menuitem" onClick={() => {setToolbarMenu(null); exportSectionSvg(document, activeSection);}}>
              <ArrowDownToLine/><span><b>SVG</b><small>Editable vector file</small></span>
            </button>
            <button type="button" role="menuitem" onClick={() => {setToolbarMenu(null); void exportSectionPng(document, activeSection);}}>
              <ImageDown/><span><b>PNG</b><small>High-resolution image</small></span>
            </button>
            <button type="button" role="menuitem" onClick={() => {setToolbarMenu(null); void copyPrompt();}}>
              <Copy/><span><b>{copyStatus || 'Copy AI prompt'}</b><small>Describe this frame for generation</small></span>
            </button>
          </div>}
        </div>
      </div>
    </div>

    <nav className="ix-studio__mobile-tabs" aria-label="Mobile studio navigation">
      <button type="button" className={mobilePanel === 'canvas' ? 'active' : ''} onClick={() => setMobilePanel('canvas')} aria-pressed={mobilePanel === 'canvas'}><Pencil/><span>Canvas</span></button>
      <button type="button" className={mobilePanel === 'sections' ? 'active' : ''} onClick={() => setMobilePanel('sections')} aria-pressed={mobilePanel === 'sections'}><Layers3/><span>Frames</span></button>
      <button type="button" className={mobilePanel === 'assets' ? 'active' : ''} onClick={() => setMobilePanel('assets')} aria-pressed={mobilePanel === 'assets'}><Library/><span>Assets</span></button>
      <div className={`ix-mobile-project-menu ix-toolbar-menu ${toolbarMenu === 'project' ? 'is-open' : ''}`}>
        <button
          type="button"
          className={toolbarMenu === 'project' ? 'active' : ''}
          onClick={() => setToolbarMenu(current => current === 'project' ? null : 'project')}
          aria-label="Open project actions"
          aria-haspopup="dialog"
          aria-expanded={toolbarMenu === 'project'}
        >
          <MoreHorizontal/><span>Project</span>
        </button>
        {toolbarMenu === 'project' && <div className="ix-mobile-project-sheet" role="dialog" aria-label="Project actions">
          <header>
            <div><b>Project</b><small>{studio.dirty ? 'Unsaved changes' : studio.message}</small></div>
            <span className={`ix-save-state ix-save-state--${studio.phase}`}>{studio.dirty ? '●' : '✓'}</span>
          </header>
          <div className="ix-mobile-project-sheet__primary">
            <button type="button" onClick={() => {setToolbarMenu(null); void studio.save();}} disabled={!studio.record || studio.phase === 'saving' || studio.phase === 'publishing'}><Save/><span>Save draft</span></button>
            <button type="button" onClick={() => {setToolbarMenu(null); void studio.publish();}} disabled={!studio.record || studio.phase === 'saving' || studio.phase === 'publishing'}><Send/><span>Publish</span></button>
            <button type="button" className="primary" onClick={() => {setToolbarMenu(null); setPreview(true);}}><Eye/><span>Preview</span></button>
            <a href={publicEngineHref} target="_blank" rel="noreferrer"><ExternalLink/><span>Public view</span></a>
          </div>
          <section>
            <b>Workspace view</b>
            <div>
              <button type="button" className={!focus && !fullscreenActive ? 'active' : ''} onClick={() => {setFocus(false); setToolbarMenu(null);}}><Square/><span>Page</span></button>
              <button type="button" className={focus && !fullscreenActive ? 'active' : ''} onClick={() => {setFocus(true); setToolbarMenu(null);}}><Focus/><span>Focus</span></button>
              <button type="button" className={fullscreenActive ? 'active' : ''} onClick={() => {setToolbarMenu(null); void fullscreen();}}><Expand/><span>Fullscreen</span></button>
            </div>
          </section>
          <section>
            <b>Export current frame</b>
            <div>
              <button type="button" onClick={() => {setToolbarMenu(null); exportSectionSvg(document, activeSection);}}><ArrowDownToLine/><span>SVG</span></button>
              <button type="button" onClick={() => {setToolbarMenu(null); void exportSectionPng(document, activeSection);}}><ImageDown/><span>PNG</span></button>
              <button type="button" onClick={() => {setToolbarMenu(null); void copyPrompt();}}><Copy/><span>AI prompt</span></button>
            </div>
          </section>
        </div>}
      </div>
    </nav>

    <div className={`ix-studio__workspace ix-studio__workspace--mobile-${mobilePanel}`}>
      <aside className="ix-studio__left" id="ix-studio-left-panel">
        <SectionPanel document={document} activeSectionId={activeSection.id} onSelect={id => {setActiveSectionId(id); setSelectedLayerIds([]);}} onChange={change}/>
        <LayerPanel
          document={document}
          activeSectionId={activeSection.id}
          selectedLayerIds={selectedLayerIds}
          onSelect={setSelectedLayerIds}
          onEditText={layer => {
            setTool('select');
            setSelectedLayerIds([layer.id]);
            setEditingTextLayerId(layer.id);
          }}
          onChange={change}
        />
        <section className={`ix-history-panel ix-history-panel--sidebar ${historyOpen ? '' : 'is-collapsed'}`} id="ix-history-panel" aria-label="Interactive Studio undo history">
          <header>
            <div><History/><span><b>Undo history</b><small>{studio.history.length} recorded change{studio.history.length === 1 ? '' : 's'}</small></span></div>
            <button className="ix-accordion-toggle" type="button" onClick={() => setHistoryOpen(open => !open)} aria-label={historyOpen ? 'Collapse history' : 'Expand history'} aria-expanded={historyOpen}>
              {historyOpen ? <ChevronUp/> : <ChevronDown/>}
            </button>
          </header>
          {historyOpen && <><nav aria-label="History scope">
            <button type="button" className={historyScope === 'all' ? 'active' : ''} onClick={() => setHistoryScope('all')}>All</button>
            <button type="button" className={historyScope === 'selected' ? 'active' : ''} onClick={() => setHistoryScope('selected')} disabled={!selectedLayer}>Selected</button>
          </nav>
          <div className="ix-history-panel__actions">
            <button type="button" onClick={() => studio.undo()} disabled={!studio.canUndo}><Undo2/>Undo <kbd>Ctrl Z</kbd></button>
            <button type="button" onClick={() => studio.redo()} disabled={!studio.canRedo}><Redo2/>Redo <kbd>Ctrl Shift Z</kbd></button>
          </div>
          {visibleHistory.length
            ? <ol>{[...visibleHistory].reverse().map(entry => <li className={entry.active ? '' : 'undone'} key={entry.id}>
              <i/>
              <span><b>{entry.label}</b><small>{new Date(entry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}{entry.active ? '' : ' · undone'}</small></span>
            </li>)}</ol>
            : <p className="ix-history-panel__empty">{historyScope === 'selected' ? 'No changes for this object yet.' : 'Make a change to start the undo history.'}</p>}
          </>}
        </section>
      </aside>

      <main className="ix-studio__canvas">
        <div className="ix-frame-meta">
          <span>{String(document.sections.findIndex(section => section.id === activeSection.id) + 1).padStart(2, '0')} / {String(document.sections.length).padStart(2, '0')}</span>
          <div>
            <input
              size={Math.max(12, Math.min(42, activeSection.name.length + 2))}
              value={activeSection.name}
              onChange={event => change(updateSection(document, activeSection.id, section => ({...section, name: event.target.value})))}
              aria-label="Current frame name"
            />
            <textarea
              cols={Math.max(32, Math.min(90, activeSection.description.length + 2))}
              rows={Math.max(1, Math.min(3, Math.ceil((activeSection.description.length + 2) / 90)))}
              value={activeSection.description}
              onChange={event => change(updateSection(document, activeSection.id, section => ({...section, description: event.target.value})))}
              aria-label="Current frame description"
              placeholder="Describe what changes in this frame…"
            />
          </div>
          <div className="ix-frame-meta__zoom" ref={setZoomControlsHost}/>
          <strong>1920 × 1080 · SVG</strong>
        </div>
        <div className="ix-stage-shell">
          <StudioStage
            document={document}
            section={activeSection}
            tool={tool}
            selectedLayerIds={selectedLayerIds}
            editingTextLayerId={editingTextLayerId}
            selectedSurfaceId={selectedSurfaceId}
            onSelectLayers={setSelectedLayerIds}
            onEditingTextLayerIdChange={setEditingTextLayerId}
            onSelectSurface={surfaceId => {
              setSelectedSurfaceId(surfaceId);
              setSurfaceMessage(`${activeSection.surfaces?.find(surface => surface.id === surfaceId)?.name || 'Surface'} selected as the asset target.`);
            }}
            onAddLayer={layer => addLayer(layer, {preserveTool: true, select: false})}
            onUpdateLayer={updateLayer}
            onUpdateLayers={updateLayers}
            onRemoveLayers={removeLayers}
            onInteractionStart={beginLayerInteraction}
            onInteractionEnd={studio.endHistory}
            onExitTool={() => setTool('select')}
            zoomControlsHost={zoomControlsHost}
          />
        </div>
        <div className="ix-stage-help">
          <span><b>Move:</b> drag or arrow keys</span>
          <span><b>Multi-select:</b> drag a box on empty canvas · Shift-click toggles objects</span>
          <span><b>Resize:</b> cyan corner</span>
          <span><b>Rotate:</b> round handle</span>
          <span><b>Skew:</b> orange diamond</span>
          <span><b>Edit text:</b> double-click the canvas text or its layer row</span>
          <span><b>Pan:</b> hold the mouse wheel and drag</span>
          <span><b>Constrain:</b> hold Shift while drawing</span>
          <span><b>Exit tool:</b> Esc</span>
          <span><b>Zoom:</b> mouse wheel · 50–400% · click percentage to reset</span>
          <span><b>Edit route:</b> select a node for add-before, add-after and remove icons · drag to move · double-click path to add</span>
          <span><b>Fine move:</b> 1 px · Shift = 10 px</span>
        </div>
        {selectedLayerIds.length > 1 && <div className="ix-selected-strip ix-selected-strip--multiple">
          <div><Check/><span><b>{selectedLayerIds.length} objects selected</b><small>Drag any selected object to move the group · Shift-click toggles an object · Delete removes the selection</small></span></div>
        </div>}
        {selectedLayer && selectedLayerIds.length === 1 && <div className="ix-selected-strip">
          <div>
            <Check/>
            <span>
              <b>{selectedLayer.name}</b>
              <small>
                P{String(selectedPartNumber).padStart(2, '0')} · {selectedLayer.type}
                {selectedLayerPlace ? ` · S${String(selectedPlaceNumber).padStart(2, '0')} ${selectedLayerPlace.name}` : ' · no calibrated place'}
              </small>
            </span>
          </div>
          {selectedLayer.type === 'text' && <label>Text<input type="text" value={selectedLayer.text || ''} onChange={event => {
            const value = event.target.value;
            updateLayer(selectedLayer.id, {text: value, name: value.trim() || 'Text note'});
          }}/></label>}
          <label>Colour<input type="color" value={(selectedLayer.stroke || selectedLayer.fill || '#ef6f4d').slice(0, 7)} onChange={event => updateLayer(selectedLayer.id, {stroke: event.target.value, fill: selectedLayer.type === 'text' ? event.target.value : selectedLayer.fill})}/></label>
          <label>Opacity<input type="range" min="0" max="1" step=".05" value={selectedLayer.opacity} onChange={event => updateLayer(selectedLayer.id, {opacity: Number(event.target.value)})}/></label>
          {!selectedLayer.calibrationRole
            && selectedLayer.description !== frameBackgroundDescription
            && Boolean(activeSection.surfaces?.length)
            && <label>
            Surface
            <select value={selectedLayer.surfaceId || ''} onChange={event => {
              const surface = activeSection.surfaces?.find(item => item.id === event.target.value);
              updateLayer(selectedLayer.id, {surfaceId: surface?.id});
              if (surface) {
                setSelectedSurfaceId(surface.id);
                setSurfaceMessage(`${selectedLayer.name} assigned to ${surface.name}. Use Fit & perspective to change its geometry.`);
              }
            }}>
              <option value="">Free placement</option>
              {activeSection.surfaces?.map(surface => <option value={surface.id} key={surface.id}>{surface.name}</option>)}
            </select>
          </label>}
          {selectedLayerSurface && <button type="button" onClick={() => updateLayer(selectedLayer.id, {
            transform: fitTransformToSurface(
              selectedLayerSurface,
              selectedLayer.transform,
              undefined,
              surfaceFitOptionsForAsset(selectedLayer.type === 'asset' ? selectedLayer.assetId : undefined),
            ),
          })}>Fit &amp; perspective to {selectedLayerSurface.name}</button>}
          <button type="button" onClick={() => reorderSelected(1)}><MoveUp/>Forward</button>
          <button type="button" onClick={() => reorderSelected(-1)}><MoveDown/>Backward</button>
          {selectedLayer.parametric && <div className="ix-parametric-controls">
            <div className="ix-parametric-controls__mode" role="group" aria-label="Parametric route visibility">
              <button type="button" onClick={() => setRouteVisibility('channel')}>Channel</button>
              <button type="button" onClick={() => setRouteVisibility('conduit')}>Conduit</button>
              <button type="button" onClick={() => setRouteVisibility('both')}>Both</button>
            </div>
            {selectedRouteChannel?.parametric && <label className="ix-parametric-controls__style">
              Chase type
              <span role="group" aria-label="Wall chase cut style">
                <button
                  type="button"
                  className={(selectedRouteChannel.parametric.chaseStyle ?? 'hand-broken') === 'hand-broken' ? 'active' : ''}
                  onClick={() => setRouteChaseStyle('hand-broken')}
                  aria-pressed={(selectedRouteChannel.parametric.chaseStyle ?? 'hand-broken') === 'hand-broken'}
                >Hand-broken</button>
                <button
                  type="button"
                  className={selectedRouteChannel.parametric.chaseStyle === 'machine-cut' ? 'active' : ''}
                  onClick={() => setRouteChaseStyle('machine-cut')}
                  aria-pressed={selectedRouteChannel.parametric.chaseStyle === 'machine-cut'}
                >Machine-cut</button>
              </span>
            </label>}
            <label title="The minimum radius grows automatically with channel width so wide chases cannot form sharp or self-intersecting corners">
              Bend radius
              <input type="range" min={selectedMinimumBendRadiusMm} max="500" step="5" value={selectedEffectiveBendRadiusMm} onChange={event => updateParametric({bendRadiusMm: Number(event.target.value)})}/>
              <output>{selectedEffectiveBendRadiusMm} mm{selectedEffectiveBendRadiusMm > selectedRequestedBendRadiusMm ? ' auto' : ''}</output>
            </label>
            {selectedRouteChannel?.parametric && <label className="ix-parametric-controls__width">
              Channel width
              <input type="range" min="20" max="160" step="1" value={selectedRouteChannel.parametric.widthMm} onChange={event => setRouteChannelWidth(Number(event.target.value))}/>
              <span className="ix-parametric-controls__exact-value">
                <input
                  type="number"
                  min="20"
                  max="160"
                  step="1"
                  value={selectedRouteChannel.parametric.widthMm}
                  aria-label="Wall chase width in millimetres"
                  onChange={event => setRouteChannelWidth(Number(event.target.value))}
                />
                <span>mm</span>
              </span>
            </label>}
            {selectedLayer.parametric.renderer === 'flex-conduit' && <label>Conduit diameter<input type="range" min="10" max="40" step="1" value={selectedLayer.parametric.widthMm} onChange={event => updateParametric({widthMm: Number(event.target.value)})}/><output>{selectedLayer.parametric.widthMm} mm</output></label>}
            {selectedLayer.parametric.renderer === 'wall-channel' && <>
              <label>Depth<input type="range" min="5" max="60" step="1" value={selectedLayer.parametric.depthMm ?? 25} onChange={event => updateParametric({depthMm: Number(event.target.value)})}/><output>{selectedLayer.parametric.depthMm ?? 25} mm</output></label>
            </>}
            {selectedLayer.parametric.renderer === 'flex-conduit' && <>
              <label>Corrugation<input type="range" min="2" max="10" step=".5" value={selectedLayer.parametric.corrugationMm ?? 4} onChange={event => updateParametric({corrugationMm: Number(event.target.value)})}/><output>{selectedLayer.parametric.corrugationMm ?? 4} mm</output></label>
              <label>Pipe colour<input type="color" value={selectedLayer.parametric.color || '#b7bbb7'} onChange={event => updateParametric({color: event.target.value})}/></label>
            </>}
          </div>}
        </div>}
      </main>

      <aside className="ix-studio__right" id="ix-studio-right-panel">
        <SurfaceManager
          surfaces={activeSection.surfaces || []}
          selectedSurfaceId={selectedSurfaceId}
          selectedGuideCount={selectedGuideCount}
          guideCount={guideCount}
          message={surfaceMessage}
          onSelectSurface={surfaceId => {
            setSelectedSurfaceId(surfaceId);
            setSurfaceMessage(`${activeSection.surfaces?.find(surface => surface.id === surfaceId)?.name || 'Surface'} selected as the asset target.`);
          }}
          onAddGuides={addCalibrationGuides}
          onDetectSurfaces={detectSurfaces}
          onUpdateSurface={updateSurface}
          onClearCalibration={clearCalibration}
        />
        <AssetManager
          document={document}
          onChange={change}
          onApplyAsset={(asset, placement) => {applyAsset(asset, placement); setMobilePanel('canvas');}}
          onAddParametricRoute={addParametricRoute}
          onTraceAssetRoutes={traceAssetRoutes}
          placementTargetName={activeSurface?.name}
        />
      </aside>
    </div>
  </section>
  </>;
}
