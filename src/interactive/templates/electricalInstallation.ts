import {
  DEFAULT_STAGE_HEIGHT,
  DEFAULT_STAGE_WIDTH,
  EXPERIENCE_SCHEMA_VERSION,
  createTransform,
  type ExperienceDocument,
  type ExperienceLayer,
  type ExperienceLayerType,
  type ExperiencePoint,
  type ExperienceSection,
} from '../engine/schema';

type LayerInput = {
  id: string;
  name: string;
  type: ExperienceLayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  text?: string;
  fontSize?: number;
  points?: ExperiencePoint[];
  opacity?: number;
  description?: string;
};

const layer = (input: LayerInput): ExperienceLayer => ({
  id: input.id,
  name: input.name,
  type: input.type,
  visible: true,
  locked: false,
  opacity: input.opacity ?? 1,
  transform: createTransform({
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
  }),
  fill: input.fill,
  stroke: input.stroke,
  strokeWidth: input.strokeWidth,
  text: input.text,
  fontSize: input.fontSize,
  points: input.points,
  description: input.description,
});

const baseRoom = (prefix: string): ExperienceLayer[] => [
  layer({id: `${prefix}-wall`, name: 'Fixed wall background', type: 'rectangle', x: 0, y: 0, width: 1920, height: 930, fill: '#dedbd4', stroke: '#c7c1b8', strokeWidth: 3, description: 'The same fixed wall datum is reused across every frame.'}),
  layer({id: `${prefix}-floor`, name: 'Finished floor datum', type: 'rectangle', x: 0, y: 930, width: 1920, height: 150, fill: '#aaa69f', stroke: '#8c8983', strokeWidth: 3}),
  layer({id: `${prefix}-corner`, name: 'Room corner datum', type: 'line', x: 166, y: 0, width: 1, height: 930, stroke: '#b6b0a8', strokeWidth: 8}),
];

const imperfectSpray = (id: string, y: number, width = 900): ExperienceLayer => layer({
  id,
  name: 'Imperfect hand-sprayed guide',
  type: 'path',
  x: 330,
  y,
  width,
  height: 50,
  stroke: '#f15b42',
  strokeWidth: 10,
  opacity: .82,
  points: [
    {x: 0, y: .62}, {x: .08, y: .43}, {x: .17, y: .55}, {x: .27, y: .37},
    {x: .39, y: .51}, {x: .48, y: .46}, {x: .6, y: .58}, {x: .71, y: .35},
    {x: .82, y: .5}, {x: .91, y: .4}, {x: 1, y: .56},
  ],
  description: 'Human spray mark: deliberately uneven, overshooting and not ruler-perfect.',
});

const channel = (id: string, x: number, y: number, width: number, height: number): ExperienceLayer => layer({
  id,
  name: 'Masonry wall chase placeholder',
  type: 'path',
  x,
  y,
  width,
  height,
  stroke: '#6f655c',
  strokeWidth: 34,
  points: [{x: 0, y: 1}, {x: .02, y: .73}, {x: -.01, y: .47}, {x: .025, y: .21}, {x: 1, y: 0}],
  description: 'Rough-edged masonry chase placeholder, to be replaced by a controlled asset.',
});

const conduit = (id: string, x: number, y: number, width: number, height: number): ExperienceLayer => layer({
  id,
  name: 'Flexible PVC conduit placeholder',
  type: 'path',
  x,
  y,
  width,
  height,
  stroke: '#aeb5b3',
  strokeWidth: 20,
  points: [{x: 0, y: 1}, {x: .02, y: .73}, {x: 0, y: .46}, {x: .025, y: .2}, {x: 1, y: 0}],
});

const worker = (id: string, label: string, x = 1210, y = 340): ExperienceLayer => layer({
  id,
  name: label,
  type: 'placeholder',
  x,
  y,
  width: 360,
  height: 590,
  fill: 'rgba(12,29,39,.74)',
  stroke: '#33cfe4',
  strokeWidth: 5,
  text: label,
  description: 'Future isolated worker asset, grounded to the fixed floor datum.',
});

const section = (id: string, name: string, description: string, additions: ExperienceLayer[] = []): ExperienceSection => ({
  id,
  name,
  description,
  background: '#dedbd4',
  focus: {x: 960, y: 540},
  layers: [...baseRoom(id), ...additions],
});

const sprayMarks = [
  imperfectSpray('spray-upper', 230, 1120),
  imperfectSpray('spray-lower', 690, 1050),
  layer({id: 'spray-vertical', name: 'Imperfect vertical guide', type: 'path', x: 390, y: 210, width: 54, height: 585, stroke: '#f15b42', strokeWidth: 10, opacity: .8, points: [{x: .5, y: 0}, {x: .43, y: .16}, {x: .6, y: .32}, {x: .45, y: .49}, {x: .53, y: .66}, {x: .38, y: .84}, {x: .51, y: 1}]}),
];

const chases = [
  channel('chase-upper-a', 390, 230, 1050, 540),
  channel('chase-lower-a', 390, 690, 980, 80),
  layer({id: 'chase-box-a', name: 'Double box wall recess', type: 'rectangle', x: 315, y: 420, width: 210, height: 135, fill: '#6f655c', stroke: '#554b43', strokeWidth: 18, description: 'Box-sized recess cut to the future back-box dimensions.'}),
  layer({id: 'chase-cabinet-a', name: 'Cabinet wall recess', type: 'rectangle', x: 305, y: 585, width: 240, height: 285, fill: '#6f655c', stroke: '#554b43', strokeWidth: 18}),
];

const boxes = [
  ...chases,
  layer({id: 'box-switch', name: 'Double-switch back box placeholder', type: 'placeholder', x: 330, y: 435, width: 180, height: 105, fill: '#3f484c', stroke: '#ef8b5b', strokeWidth: 5, text: 'BACK BOX'}),
  layer({id: 'box-cabinet-feed', name: 'Cabinet feed box placeholder', type: 'placeholder', x: 330, y: 610, width: 190, height: 225, fill: '#3f484c', stroke: '#ef8b5b', strokeWidth: 5, text: 'FEED BOX'}),
  worker('worker-boxes', 'ELECTRICIAN · MORTAR + TROWEL'),
];

const conduits = [
  ...boxes.filter(item => !item.id.startsWith('worker-')),
  conduit('conduit-upper', 415, 242, 1020, 520),
  conduit('conduit-lower', 415, 700, 940, 70),
  worker('worker-conduit', 'ELECTRICIAN · FIT CONDUIT'),
];

const cables = [
  ...conduits.filter(item => !item.id.startsWith('worker-')),
  layer({id: 'cable-red', name: 'Red conductor movement', type: 'path', x: 420, y: 250, width: 1000, height: 505, stroke: '#c92525', strokeWidth: 7, points: [{x: 0, y: 1}, {x: .02, y: .47}, {x: .03, y: .2}, {x: 1, y: 0}]}),
  layer({id: 'cable-black', name: 'Black conductor movement', type: 'path', x: 436, y: 258, width: 990, height: 500, stroke: '#17191a', strokeWidth: 7, points: [{x: 0, y: 1}, {x: .02, y: .47}, {x: .03, y: .2}, {x: 1, y: 0}]}),
  worker('worker-cables', 'ELECTRICIAN · PULL CABLES', 1230, 340),
];

const cabinet = layer({id: 'cabinet-placeholder', name: 'Two-door driver cabinet', type: 'placeholder', x: 270, y: 310, width: 310, height: 460, fill: 'rgba(57,38,24,.78)', stroke: '#d59c69', strokeWidth: 6, text: 'CABINET · OPEN DOORS'});
const shelfLayers = [0, 1, 2, 3].map(index => layer({id: `shelf-${index + 1}`, name: `Shelf ${index + 1}`, type: 'placeholder', x: 660, y: 270 + index * 155, width: 620, height: 74, fill: '#35271e', stroke: '#c68a5c', strokeWidth: 4, text: `SHELF ${index + 1}`}));
const lowerShelf = layer({id: 'shelf-lower', name: 'Long lower shelf', type: 'placeholder', x: 660, y: 890, width: 1040, height: 75, fill: '#35271e', stroke: '#c68a5c', strokeWidth: 4, text: 'LOWER SHELF'});

export const electricalInstallationTemplate: ExperienceDocument = {
  schemaVersion: EXPERIENCE_SCHEMA_VERSION,
  id: 'experience-electrical-installations',
  slug: 'electrical-installations',
  title: 'How an installation is built',
  description: 'A frame-by-frame electrical installation template. Replace every placeholder independently from the asset library.',
  stage: {
    width: DEFAULT_STAGE_WIDTH,
    height: DEFAULT_STAGE_HEIGHT,
    background: '#dedbd4',
  },
  settings: {
    transition: 'cut',
    showProgress: true,
  },
  assetGroups: [
    {id: 'group-backgrounds', name: 'Backgrounds', visible: true, collapsed: false, assets: []},
    {id: 'group-people', name: 'People', visible: true, collapsed: false, assets: []},
    {id: 'group-first-fix', name: 'First fix', visible: true, collapsed: false, assets: []},
    {id: 'group-second-fix', name: 'Second fix & lighting', visible: true, collapsed: false, assets: []},
  ],
  sections: [
    section('section-empty-wall', 'Empty room', 'The fixed wall and finished-floor datum establish one consistent layout for every following frame.'),
    section('section-marking', 'Measure and mark', 'The electrician measures and applies imperfect, human spray guides, then leaves the scene.', [...sprayMarks, worker('worker-marking', 'ELECTRICIAN · MEASURE + SPRAY')]),
    section('section-wall-chases', 'Cut wall chases', 'Only the builder cuts realistic wall and box recesses. Dust and fragments will be supplied by the future asset set.', [...chases, worker('worker-chases', 'BUILDER · WALL CHASER')]),
    section('section-bed-boxes', 'Bed the boxes', 'The electrician secures correctly sized boxes in their recesses using mortar, a bucket and a trowel.', boxes),
    section('section-fit-conduit', 'Fit flexible conduit', 'Flexible PVC conduit follows the prepared chases and terminates at the correct boxes or cabinet routes.', conduits),
    section('section-pull-cables', 'Pull conductors', 'Red and black conductors visibly travel through the installed conduit; the worker pulls from a real conduit end.', cables),
    section('section-repair-wall', 'Repair and finish wall', 'The wall is closed, plastered and painted with no worker left standing in the frame.'),
    section('section-cabinet', 'Install driver cabinet', 'The two cabinet doors can later open to reveal transformers, separated supplies, connections and cables.', [cabinet]),
    section('section-shelves', 'Install shelves', 'Four shelf elements and the long lower shelf are positioned against the unchanged wall.', [cabinet, ...shelfLayers, lowerShelf]),
    section('section-aluminium', 'Fit aluminium profiles', 'Slim aluminium LED profiles are fitted into the prepared shelf channels.', [cabinet, ...shelfLayers, lowerShelf, ...shelfLayers.map((item, index) => layer({id: `profile-${index + 1}`, name: `Aluminium profile ${index + 1}`, type: 'rectangle', x: item.transform.x + 30, y: item.transform.y + 53, width: item.transform.width - 60, height: 12, fill: '#bcc5c7', stroke: '#e1e7e8', strokeWidth: 2}))]),
    section('section-led-strips', 'Install LED strips', 'Editable LED-strip layers are placed inside every aluminium profile and below the long shelf.', [cabinet, ...shelfLayers, lowerShelf, ...shelfLayers.map((item, index) => layer({id: `led-${index + 1}`, name: `Shelf LED ${index + 1}`, type: 'line', x: item.transform.x + 38, y: item.transform.y + 59, width: item.transform.width - 76, height: 1, stroke: '#f0c64c', strokeWidth: 8})), layer({id: 'led-lower', name: 'Lower shelf LED', type: 'line', x: 700, y: 958, width: 960, height: 1, stroke: '#f0c64c', strokeWidth: 8})]),
    section('section-double-switch', 'Fit double switch', 'The electrician uses the drill only for closing and fitting the final double light switch.', [cabinet, ...shelfLayers, lowerShelf, layer({id: 'double-switch', name: 'Double switch placeholder', type: 'placeholder', x: 330, y: 450, width: 180, height: 120, fill: '#f3f1eb', stroke: '#a9a49c', strokeWidth: 4, text: 'DOUBLE SWITCH'}), worker('worker-switch', 'ELECTRICIAN · DRILL SWITCH')]),
    section('section-power-on', 'Power on', 'The first switch controls all four shelf LEDs; the second controls the long lower LED with a smooth fade.', [cabinet, ...shelfLayers, lowerShelf, ...shelfLayers.map((item, index) => layer({id: `powered-led-${index + 1}`, name: `Powered shelf LED ${index + 1}`, type: 'line', x: item.transform.x + 38, y: item.transform.y + 59, width: item.transform.width - 76, height: 1, stroke: '#fff1a8', strokeWidth: 18})), layer({id: 'powered-led-lower', name: 'Powered lower LED', type: 'line', x: 700, y: 958, width: 960, height: 1, stroke: '#fff1a8', strokeWidth: 18}), layer({id: 'double-switch-final', name: 'Interactive double switch', type: 'placeholder', x: 330, y: 450, width: 180, height: 120, fill: '#f3f1eb', stroke: '#a9a49c', strokeWidth: 4, text: 'SWITCH 1 · SWITCH 2'})]),
  ],
};
