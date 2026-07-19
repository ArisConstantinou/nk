import {
  createStableId,
  createTransform,
  DEFAULT_ROUTE_BEND_RADIUS_MM,
  type ExperienceLayer,
  type ExperiencePoint,
  type LayerTransform,
} from '../engine/schema';

export const DEFAULT_CHANNEL_WIDTH_MM = 40;
export const DEFAULT_CONDUIT_DIAMETER_MM = 20;

const defaultPoints: ExperiencePoint[] = [
  {x: 0, y: 1},
  {x: 0, y: 0},
  {x: 1, y: 0},
];

export function createElectricalRoutePair(options: {
  name?: string;
  transform?: Partial<LayerTransform>;
  points?: ExperiencePoint[];
  showChannel?: boolean;
  showConduit?: boolean;
} = {}): [ExperienceLayer, ExperienceLayer] {
  const routeId = createStableId('route');
  const transform = createTransform({
    x: 360,
    y: 230,
    width: 960,
    height: 570,
    ...options.transform,
  });
  const points = (options.points || defaultPoints).map(point => ({...point}));
  const name = options.name || 'Electrical route';
  const channel: ExperienceLayer = {
    id: createStableId('layer'),
    name: `${name} · wall channel`,
    type: 'parametric-path',
    visible: options.showChannel !== false,
    locked: false,
    opacity: 1,
    transform: {...transform},
    points: points.map(point => ({...point})),
    parametric: {
      renderer: 'wall-channel',
      routeId,
      widthMm: DEFAULT_CHANNEL_WIDTH_MM,
      depthMm: 25,
      bendRadiusMm: DEFAULT_ROUTE_BEND_RADIUS_MM,
    },
    description: 'A clean 40 mm machine-cut wall chase with parallel edges. Its editable route supports straight runs, sharp turns and smooth freeform bends.',
  };
  const conduit: ExperienceLayer = {
    id: createStableId('layer'),
    name: `${name} · 20 mm flexible conduit`,
    type: 'parametric-path',
    visible: options.showConduit !== false,
    locked: false,
    opacity: 1,
    transform: {...transform},
    points: points.map(point => ({...point})),
    parametric: {
      renderer: 'flex-conduit',
      routeId,
      widthMm: DEFAULT_CONDUIT_DIAMETER_MM,
      corrugationMm: 4,
      bendRadiusMm: DEFAULT_ROUTE_BEND_RADIUS_MM,
      color: '#b7bbb7',
    },
    description: 'Corrugated flexible electrical conduit centred inside the linked wall channel.',
  };
  return [channel, conduit];
}
