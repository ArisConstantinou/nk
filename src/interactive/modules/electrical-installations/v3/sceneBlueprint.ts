export const V3_ASSET_ROOT = '/assets/generated/electrical-installation-v3';

export const v3Assets = {
  room: `${V3_ASSET_ROOT}/room-empty-v3.webp`,
  leftSwitchChase: `${V3_ASSET_ROOT}/left-switch-chase-v3.webp`,
  electricianMarking: `${V3_ASSET_ROOT}/electrician-marking-v3.webp`,
  builderChasing: `${V3_ASSET_ROOT}/builder-chaser-v3.webp`,
  electricianBoxes: `${V3_ASSET_ROOT}/electrician-boxes-v3.webp`,
  electricianConduit: `${V3_ASSET_ROOT}/electrician-conduit-v3.webp`,
  electricianCables: `${V3_ASSET_ROOT}/electrician-cables-v3.webp`,
  electricianSwitch: `${V3_ASSET_ROOT}/electrician-switch-v3.webp`,
  cabinetInterior: `${V3_ASSET_ROOT}/cabinet-interior-v3.webp`,
  smokedOak: `${V3_ASSET_ROOT}/smoked-oak-v3.webp`,
} as const;

export const installationStages = [
  {id: 'empty', number: '01', short: 'EMPTY ROOM', title: 'A clean starting point', detail: 'The wall and finished-floor datum are checked before any setting out begins.'},
  {id: 'marking', number: '02', short: 'MEASURE + MARK', title: 'Measured, marked, verified', detail: 'The electrician measures every termination and spray-marks the approved routes.'},
  {id: 'chasing', number: '03', short: 'CHASE WALL', title: 'Real channels are cut', detail: 'The builder alone uses the dust-controlled wall chaser; dust and masonry fragments follow the cut.'},
  {id: 'boxes', number: '04', short: 'BED BOXES', title: 'Boxes are bedded in mortar', detail: 'The electrician uses a mortar bucket and masonry trowel. Nothing floats and no drill is used.'},
  {id: 'conduits', number: '05', short: 'FIT CONDUIT', title: 'Conduit follows every chase', detail: 'Narrow grey flexible PVC conduit is installed inside the channels and secured with mortar at practical intervals.'},
  {id: 'cables', number: '06', short: 'PULL CABLES', title: 'Conductors move through conduit', detail: 'Brown, blue and green/yellow mains conductors remain separate from red-and-black 24V LED pairs.'},
  {id: 'finish', number: '07', short: 'REPAIR + PAINT', title: 'The wall is made good', detail: 'The finishing trade repairs, smooths and paints the wall while every electrical termination remains accessible.'},
  {id: 'cabinet', number: '08', short: 'CABINET', title: 'Drivers remain serviceable', detail: 'Both doors open to show protected 230V inputs and separated 24V driver outputs.'},
  {id: 'shelves', number: '09', short: 'SHELVES', title: 'Joinery meets the first fix', detail: 'Four short shelves and one lower shelf align with their direct conduit entries.'},
  {id: 'profiles', number: '10', short: 'ALUMINIUM', title: 'Profiles manage LED heat', detail: 'Editable aluminium channels are installed into the timber recesses.'},
  {id: 'leds', number: '11', short: 'LED STRIPS', title: 'Two lighting circuits are connected', detail: 'Four shelf strips form circuit one; the long lower strip forms circuit two.'},
  {id: 'switch', number: '12', short: 'DOUBLE SWITCH', title: 'Second fix completes control', detail: 'This is the only stage where the electrician uses a drill to close the finished switch plate.'},
  {id: 'power', number: '13', short: 'POWER ON', title: 'Tested, energised, interactive', detail: 'Both circuits rise smoothly and can then be switched independently.'},
] as const;

export type InstallationStageId = typeof installationStages[number]['id'];
export type SceneObjectKind = 'image' | 'group' | 'mesh' | 'light' | 'effect';
export type AnimationPreset =
  | 'none'
  | 'enter-left'
  | 'enter-right'
  | 'draw'
  | 'pop'
  | 'wipe'
  | 'door-left'
  | 'door-right'
  | 'glow'
  | 'particles';

export type Transform2D = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
};

export type Transform3D = {
  x: number;
  y: number;
  z: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scale: number;
};

export type SceneObjectDefinition = {
  id: string;
  label: string;
  category: string;
  kind: SceneObjectKind;
  asset?: string;
  stageIn: number;
  stageOut: number;
  animation: AnimationPreset;
  transform2d: Transform2D;
  transform3d: Transform3D;
  properties: {
    enabled: boolean;
    opacity: number;
    color?: string;
    roughness?: number;
    metalness?: number;
    intensity?: number;
  };
};

const object = (
  id: string,
  label: string,
  category: string,
  kind: SceneObjectKind,
  stageIn: number,
  animation: AnimationPreset,
  transform2d: Partial<Transform2D> = {},
  transform3d: Partial<Transform3D> = {},
  asset?: string,
): SceneObjectDefinition => ({
  id,
  label,
  category,
  kind,
  asset,
  stageIn,
  stageOut: 12,
  animation,
  transform2d: {x: 0, y: 0, width: 100, height: 100, rotation: 0, scale: 1, ...transform2d},
  transform3d: {x: 0, y: 0, z: 0, rotationX: 0, rotationY: 0, rotationZ: 0, scale: 1, ...transform3d},
  properties: {enabled: true, opacity: 1, roughness: .72, metalness: 0},
});

const workers = [
  object('worker-marking', 'Electrician — marking', 'Workers', 'image', 1, 'enter-right', {x: 520, y: 218, width: 279, height: 660}, {x: .8, y: 0, z: .18, scale: 1.7}, v3Assets.electricianMarking),
  object('worker-chasing', 'Builder — wall chaser', 'Workers', 'image', 2, 'enter-right', {x: 525, y: 218, width: 474, height: 660}, {x: .65, y: 0, z: .17, scale: 1.72}, v3Assets.builderChasing),
  object('worker-boxes', 'Electrician — mortar boxes', 'Workers', 'image', 3, 'enter-left', {x: 58, y: 218, width: 479, height: 660}, {x: -1.25, y: 0, z: .2, scale: 1.45}, v3Assets.electricianBoxes),
  object('worker-conduit', 'Electrician — conduit mortar', 'Workers', 'image', 4, 'enter-right', {x: 270, y: 218, width: 384, height: 660}, {x: -.45, y: 0, z: .2, scale: 1.5}, v3Assets.electricianConduit),
  object('worker-cables', 'Electrician — cable pull', 'Workers', 'image', 5, 'enter-right', {x: 494, y: 258, width: 426, height: 620}, {x: .35, y: 0, z: .2, scale: 1.65}, v3Assets.electricianCables),
  object('worker-switch', 'Electrician — switch drill', 'Workers', 'image', 11, 'enter-left', {x: 70, y: 352, width: 417, height: 526}, {x: -1.42, y: 0, z: .2, scale: 1.5}, v3Assets.electricianSwitch),
] as const;

const constructionObjects = [
  object('room', 'Empty room plate', 'Architecture', 'image', 0, 'none', {width: 1600, height: 900}, {z: -.2}, v3Assets.room),
  object('setout', 'Spray set-out marks', 'First fix', 'group', 1, 'draw'),
  object('spray-cloud', 'Spray mist', 'Effects', 'effect', 1, 'particles'),
  object('wall-chases', 'Switch channel and box chase', 'First fix', 'image', 2, 'wipe', {x: 45, y: 334, width: 110, height: 474}, {z: .02}, v3Assets.leftSwitchChase),
  object('chase-dust', 'Chasing dust', 'Effects', 'effect', 2, 'particles'),
  object('switch-back-box', 'Double-switch back box', 'First fix', 'mesh', 3, 'pop', {x: 54, y: 350, width: 92, height: 82}, {x: -2.1, y: .15, z: .06}),
  object('mortar-splatter', 'Mortar splatter', 'Effects', 'effect', 3, 'particles'),
  object('conduits', 'Flexible PVC conduit route', 'First fix', 'group', 4, 'draw', {}, {z: .08}),
  object('mains-cables', '230V conductors', 'Wiring', 'group', 5, 'draw', {}, {z: .11}),
  object('led-cables', '24V red/black pairs', 'Wiring', 'group', 5, 'draw', {}, {z: .12}),
  object('wall-finish', 'Repaired painted wall', 'Architecture', 'mesh', 6, 'wipe', {x: 151, width: 1449, height: 832}, {z: .14}),
  object('cabinet-shell', 'Timber cabinet', 'Joinery', 'mesh', 7, 'pop', {x: 188, y: 632, width: 190, height: 214}, {x: -1.16, y: -1.1, z: .22}, v3Assets.smokedOak),
  object('cabinet-interior', 'Drivers and wiring', 'Electrical', 'image', 7, 'pop', {x: 201, y: 646, width: 164, height: 184}, {x: -1.16, y: -1.1, z: .24}, v3Assets.cabinetInterior),
  object('cabinet-door-left', 'Cabinet left door', 'Joinery', 'mesh', 7, 'door-left', {x: 194, y: 640, width: 87, height: 198}, {x: -1.43, y: -1.1, z: .28}, v3Assets.smokedOak),
  object('cabinet-door-right', 'Cabinet right door', 'Joinery', 'mesh', 7, 'door-right', {x: 283, y: 640, width: 87, height: 198}, {x: -.89, y: -1.1, z: .28}, v3Assets.smokedOak),
  ...[0, 1, 2, 3].map(index => object(`shelf-${index + 1}`, `Timber shelf ${index + 1}`, 'Joinery', 'mesh', 8, 'pop', {x: 180, y: 132 + index * 140, width: 337, height: 29}, {x: -.65, y: .78 - index * .55, z: .28}, v3Assets.smokedOak)),
  object('shelf-lower', 'Long lower shelf', 'Joinery', 'mesh', 8, 'pop', {x: 370, y: 606, width: 1168, height: 40}, {x: 1.05, y: -1.03, z: .3}, v3Assets.smokedOak),
  ...[0, 1, 2, 3].map(index => object(`profile-${index + 1}`, `Aluminium profile ${index + 1}`, 'Lighting', 'mesh', 9, 'pop', {x: 205, y: 158 + index * 140, width: 295, height: 10}, {x: -.64, y: .68 - index * .55, z: .34})),
  object('profile-lower', 'Lower aluminium profile', 'Lighting', 'mesh', 9, 'pop', {x: 398, y: 642, width: 1118, height: 11}, {x: 1.1, y: -1.2, z: .35}),
  ...[0, 1, 2, 3].map(index => object(`led-${index + 1}`, `Shelf LED strip ${index + 1}`, 'Lighting', 'light', 10, 'glow', {x: 211, y: 163 + index * 140, width: 283, height: 4}, {x: -.64, y: .64 - index * .55, z: .38})),
  object('led-lower', 'Lower LED strip', 'Lighting', 'light', 10, 'glow', {x: 407, y: 648, width: 1100, height: 4}, {x: 1.1, y: -1.24, z: .39}),
  object('double-switch', 'Double light switch', 'Controls', 'mesh', 11, 'pop', {x: 54, y: 348, width: 92, height: 86}, {x: -2.1, y: .12, z: .17}),
  object('shelf-light', 'Shelf lighting output', 'Lighting', 'light', 12, 'glow', {}, {x: -.55, y: .2, z: 1.25}),
  object('lower-light', 'Lower lighting output', 'Lighting', 'light', 12, 'glow', {}, {x: .65, y: -1.2, z: 1.2}),
] as const;

const stageOutOverrides: Record<string, number> = {
  setout: 1,
  'spray-cloud': 1,
  'wall-chases': 5,
  'chase-dust': 2,
  'switch-back-box': 5,
  'mortar-splatter': 3,
  conduits: 5,
  'mains-cables': 5,
  'led-cables': 5,
  'worker-marking': 1,
  'worker-chasing': 2,
  'worker-boxes': 3,
  'worker-conduit': 4,
  'worker-cables': 5,
  'worker-switch': 11,
};

export const initialSceneBlueprint: readonly SceneObjectDefinition[] = [
  ...constructionObjects,
  ...workers,
].map(item => ({...item, stageOut: stageOutOverrides[item.id] ?? item.stageOut}));

export const cloneSceneBlueprint = (): SceneObjectDefinition[] =>
  initialSceneBlueprint.map(item => ({
    ...item,
    transform2d: {...item.transform2d},
    transform3d: {...item.transform3d},
    properties: {...item.properties},
  }));
