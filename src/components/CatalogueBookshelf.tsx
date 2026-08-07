import {useEffect, useRef, useState, type CSSProperties, type ReactNode} from 'react';
import {Maximize2, Minimize2, Minus, Plus, Power, Sparkles} from 'lucide-react';
import {Link, useLocation} from 'react-router-dom';
import type {Catalogue} from '../types';
import {publicAsset} from '../utils/assets';
import {catalogueShelfCover, CatalogueCoverPreview} from './CatalogueCoverPreview';
import {catalogueBookLink} from './UnifiedCatalogueBook';

type ShelfLightChannel = {
  color: string;
  brightness: number;
  power: boolean;
};

type CatalogueBookshelfProps = {
  catalogues: Catalogue[];
  sourceCatalogues: Catalogue[];
  filters?: ReactNode;
};

type CatalogueDisplayMode = '3d' | 'flat';

const displayModeStorageKey = 'nk:catalogue-display-mode';

const readStoredDisplayMode = (): CatalogueDisplayMode => {
  if (typeof window === 'undefined') return '3d';
  try {
    return window.localStorage.getItem(displayModeStorageKey) === 'flat' ? 'flat' : '3d';
  } catch {
    return '3d';
  }
};

const defaultChannels: ShelfLightChannel[] = [
  {color: '#e7b67b', brightness: 78, power: true},
];
const unlitShelfChannel: ShelfLightChannel = {color: '#e7b67b', brightness: 0, power: false};

const colourPresets = [
  {value: '#e7b67b', label: 'Warm'},
  {value: '#52dfff', label: 'Ice'},
  {value: '#ad7cff', label: 'Violet'},
  {value: '#ff6f91', label: 'Rose'},
  {value: '#80e58f', label: 'Leaf'},
];
const knxSwitchObjects = [
  {label: 'Toggle shelf light', screenLabel: 'POWER', faceLabel: 'Power', symbol: 'power', faceColor: null},
  {label: 'Dim shelf light', screenLabel: 'DIM -', faceLabel: 'Dim', symbol: 'minus', faceColor: null},
  {label: 'Brighten shelf light', screenLabel: 'DIM +', faceLabel: 'Bright', symbol: 'plus', faceColor: null},
  {label: 'Set warm white', screenLabel: 'CCT', faceLabel: 'Warm', symbol: 'colour', faceColor: '#e7b67b'},
  {label: 'Set ice white', screenLabel: 'CCT', faceLabel: 'Ice', symbol: 'colour', faceColor: '#52dfff'},
  {label: 'Set violet scene', screenLabel: 'RGB', faceLabel: 'Violet', symbol: 'colour', faceColor: '#ad7cff'},
  {label: 'Set rose scene', screenLabel: 'RGB', faceLabel: 'Rose', symbol: 'colour', faceColor: '#ff6f91'},
  {label: 'Set leaf scene', screenLabel: 'RGB', faceLabel: 'Leaf', symbol: 'colour', faceColor: '#80e58f'},
] as const;
const catalogueBrandOrder: Catalogue['brand'][] = ['ACA', 'Nova Luce', 'VIOKEF'];
const catalogueBrandAccents: Record<Catalogue['brand'], string> = {
  ACA: '#e8c486',
  'Nova Luce': '#8fc8e8',
  VIOKEF: '#ef927d',
};

const shelfDecorations = [
  {
    id: 'puk-table-led-light',
    kind: 'puk',
    name: 'Puk Table LED Light',
    src: 'assets/catalogue-products/shelf-decor/puk-table-led-light-shelf-v1.webp',
  },
  {
    id: 'belfast-table-light',
    kind: 'belfast',
    name: 'Belfast Table Light',
    src: 'assets/catalogue-products/shelf-decor/belfast-table-light-shelf-v1.webp',
  },
  {
    id: 'rechargeable-zeta-table-light',
    kind: 'zeta',
    name: 'Rechargeable Zeta Table Light',
    src: 'assets/catalogue-products/shelf-decor/rechargeable-zeta-table-light-shelf-v1.webp',
  },
] as const;

const spineFinishes = [
  {cover: '#52604b', edge: '#c8b583', ink: '#fff4d7', page: '#d9cdb7', band: '#b8a46e', material: 'linen', layout: 'classic', width: 44, height: 94, depth: 7, lean: -.8, radius: 5},
  {cover: '#102d55', edge: '#91a9c7', ink: '#f6f8ff', page: '#e4dccd', band: '#b8c5d8', material: 'coated', layout: 'modern', width: 39, height: 88, depth: 5, lean: .35, radius: 3},
  {cover: '#e7dfcf', edge: '#9f8d71', ink: '#2d2924', page: '#cfc3ad', band: '#74644f', material: 'paper', layout: 'framed', width: 47, height: 96, depth: 4, lean: -.15, radius: 2},
  {cover: '#1f3b52', edge: '#87a3b5', ink: '#f2f7f8', page: '#d8cdbb', band: '#9ab4c4', material: 'buckram', layout: 'label', width: 36, height: 84, depth: 6, lean: .9, radius: 4},
  {cover: '#b47732', edge: '#e1b66e', ink: '#fff8e9', page: '#e0d2b8', band: '#f1cf91', material: 'canvas', layout: 'split', width: 42, height: 90, depth: 7, lean: -.45, radius: 5},
  {cover: '#24525a', edge: '#81aeb0', ink: '#f3fbf8', page: '#d6ccb9', band: '#a5c8c4', material: 'coated', layout: 'minimal', width: 45, height: 86, depth: 5, lean: .2, radius: 3},
  {cover: '#744734', edge: '#d09a72', ink: '#fff1df', page: '#d8c7ac', band: '#d5a47a', material: 'leather', layout: 'classic', width: 38, height: 92, depth: 8, lean: -1.1, radius: 6},
  {cover: '#746b61', edge: '#beb2a4', ink: '#fff9ee', page: '#ddd3c2', band: '#d2c7b7', material: 'linen', layout: 'label', width: 41, height: 82, depth: 6, lean: .65, radius: 4},
  {cover: '#343b3d', edge: '#93a0a2', ink: '#f5f7f4', page: '#d5c9b5', band: '#a7b0b1', material: 'buckram', layout: 'modern', width: 46, height: 95, depth: 5, lean: -.25, radius: 3},
  {cover: '#923f2f', edge: '#d88d70', ink: '#fff3e9', page: '#dfd1bc', band: '#efac8e', material: 'leather', layout: 'split', width: 40, height: 89, depth: 8, lean: .8, radius: 6},
  {cover: '#82285b', edge: '#cb7ba6', ink: '#fff0f8', page: '#d9c9b7', band: '#e29abd', material: 'coated', layout: 'framed', width: 43, height: 93, depth: 5, lean: -.55, radius: 3},
  {cover: '#475a71', edge: '#94a5ba', ink: '#f7f9fc', page: '#d9cebb', band: '#b0bdcb', material: 'canvas', layout: 'minimal', width: 37, height: 85, depth: 6, lean: .3, radius: 4},
  {cover: '#eee7d9', edge: '#aa9c83', ink: '#39342d', page: '#cdbfa8', band: '#8d7d64', material: 'paper', layout: 'label', width: 48, height: 91, depth: 4, lean: -.9, radius: 2},
  {cover: '#5b6351', edge: '#afb59a', ink: '#faf7ea', page: '#d8cdb8', band: '#c4caaa', material: 'linen', layout: 'classic', width: 35, height: 80, depth: 7, lean: .55, radius: 5},
];

const brandMark = (brand: Catalogue['brand']) => (
  brand === 'Nova Luce' ? 'NOVA' : brand === 'VIOKEF' ? 'VIO' : brand
);

const spineEdition = (year: string) => (
  year === 'Collection' ? 'ED' : year.slice(-2)
);

const spineTitle = (catalogue: Catalogue) => {
  const fallbackByFocus: Record<Catalogue['focus'], string> = {
    Decorative: 'LIGHTING',
    Architectural: 'ARCH.',
    Kids: 'KIDS',
    Natural: 'NATURAL',
    Fans: 'FANS',
  };
  const title = catalogue.name
    .replace(new RegExp(`^${catalogue.brand}\\s*`, 'i'), '')
    .replace(new RegExp(`\\b${catalogue.year}\\b`, 'i'), '')
    .replace(/[·–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (title || fallbackByFocus[catalogue.focus])
    .replace(/ceiling fans/i, 'FANS')
    .replace(/book\s+(\d+)/i, 'BOOK$1')
    .replace(/lighting/i, 'LIGHT')
    .replace(/collection/i, 'EDITION')
    .replace(/natural/i, 'NAT.')
    .replace(/decorative/i, 'LIGHT')
    .replace(/architectural/i, 'ARCH.')
    .toUpperCase();
};

const spineCompactTitle = (catalogue: Catalogue) => (
  spineTitle(catalogue)
    .replace(/^LIGHT$/, 'LGT')
    .replace(/^BOOK(\d+)$/, 'B$1')
    .replace(/^NETTO$/, 'NET')
    .replace(/^NAT\.$/, 'NAT')
    .slice(0, 4)
);

const hexToRgba = (hex: string, alpha: number) => {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
};

const distributeCatalogues = (catalogues: Catalogue[]) => {
  return catalogueBrandOrder.map(brand => (
    catalogues.filter(catalogue => catalogue.brand === brand)
  ));
};

export function CatalogueBookshelf({catalogues, sourceCatalogues, filters}: CatalogueBookshelfProps) {
  const location = useLocation();
  const [channels, setChannels] = useState<ShelfLightChannel[]>(defaultChannels);
  const [activeShelf, setActiveShelf] = useState(0);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeSwitchKey, setActiveSwitchKey] = useState<number | null>(null);
  const [displayMode, setDisplayMode] = useState<CatalogueDisplayMode>(readStoredDisplayMode);
  const sceneRef = useRef<HTMLDivElement>(null);
  const brandGroups = distributeCatalogues(catalogues);
  const shelfRows = ['catalogues', 'products'] as const;
  const mobileCatalogueRows = [
    catalogues.slice(0, Math.ceil(catalogues.length / 2)),
    catalogues.slice(Math.ceil(catalogues.length / 2)),
  ];
  const activeChannel = channels[activeShelf];

  useEffect(() => {
    if (location.hash !== '#catalogue-room') return;
    const frame = window.requestAnimationFrame(() => {
      sceneRef.current?.scrollIntoView({block: 'start', behavior: 'auto'});
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.key]);

  const patchActiveChannel = (patch: Partial<ShelfLightChannel>) => {
    setChannels(current => current.map((channel, index) => (
      index === activeShelf ? {...channel, ...patch} : channel
    )));
  };

  const triggerSwitchObject = (index: number) => {
    setActiveSwitchKey(index);

    if (index === 0) {
      patchActiveChannel({power: !activeChannel.power});
      return;
    }

    if (index === 1) {
      patchActiveChannel({
        brightness: Math.max(10, activeChannel.brightness - 10),
        power: true,
      });
      return;
    }

    if (index === 2) {
      patchActiveChannel({
        brightness: Math.min(100, activeChannel.brightness + 10),
        power: true,
      });
      return;
    }

    const preset = colourPresets[index - 3];
    if (preset) {
      patchActiveChannel({color: preset.value, power: true});
    }
  };

  const switchFeedback = (() => {
    if (activeSwitchKey === null) {
      return {
        label: `ZONE ${String(activeShelf + 1).padStart(2, '0')}`,
        value: activeChannel.power ? `${activeChannel.brightness}%` : 'OFF',
      };
    }

    if (activeSwitchKey === 0) {
      return {label: knxSwitchObjects[0].screenLabel, value: activeChannel.power ? 'ON' : 'OFF'};
    }

    if (activeSwitchKey === 1 || activeSwitchKey === 2) {
      return {
        label: knxSwitchObjects[activeSwitchKey].screenLabel,
        value: `${activeChannel.brightness}%`,
      };
    }

    const preset = colourPresets[activeSwitchKey - 3];
    return {
      label: knxSwitchObjects[activeSwitchKey].screenLabel,
      value: preset?.label.toUpperCase() ?? 'SET',
    };
  })();

  const selectDisplayMode = (mode: CatalogueDisplayMode) => {
    setDisplayMode(mode);
    try {
      window.localStorage.setItem(displayModeStorageKey, mode);
    } catch {
      // The visual switch still works when storage is unavailable.
    }
  };

  return <section className="catalogue-library-room section" aria-labelledby="catalogue-library-room-title">
    <div className="catalogue-library-room__heading">
      <div>
        <span><Sparkles/> THE READING ROOM</span>
        <h2 id="catalogue-library-room-title">Choose a spine.<br/><em>Open the collection.</em></h2>
      </div>
      <div className="catalogue-library-room__heading-copy">
        <p>Every official ACA, Nova Luce and VIOKEF highlight now sits together in one focused collection. Choose a spine to open the shared page-turning reader.</p>
      </div>
    </div>

    <div
      ref={sceneRef}
      className="catalogue-library-room__scene"
      id="catalogue-room"
      data-book-view={displayMode}
    >
      <figure className="catalogue-mobile-room-plate" aria-hidden="true">
        <img
          src={publicAsset('assets/generated/catalogue-reading-room-two-shelf-compact-narrow-unlit-v8.webp')}
          alt=""
        />
      </figure>
      <div
        className="catalogue-bookcase"
        aria-label={`Interactive two-row catalogue display in ${displayMode === '3d' ? 'three-dimensional' : 'flat'} view`}
      >
        <div className="catalogue-bookcase__crown"><span>NK</span><small>CATALOGUE LIBRARY</small></div>
        {shelfRows.map((rowKind, shelfIndex) => {
          const isLitShelf = shelfIndex < channels.length;
          const channel = channels[shelfIndex] ?? unlitShelfChannel;
          const lightStrength = isLitShelf && channel.power ? channel.brightness / 100 : 0;
          const shelfStyle = {
            '--shelf-light': channel.color,
            '--shelf-core': hexToRgba(channel.color, Math.min(1, lightStrength * 1.1)),
            '--shelf-glow': hexToRgba(channel.color, lightStrength * 0.68),
            '--shelf-wash': hexToRgba(channel.color, lightStrength * 0.22),
          } as CSSProperties;

          return <div
            className={`catalogue-shelf${activeShelf === shelfIndex ? ' is-active' : ''}`}
            data-shelf={shelfIndex + 1}
            data-row={rowKind}
            data-power={isLitShelf && channel.power ? 'on' : 'off'}
            style={shelfStyle}
            key={rowKind}
          >
            <div className="catalogue-shelf__number">
              <span>{String(shelfIndex + 1).padStart(2, '0')}</span>
              <small>{isLitShelf && channel.power ? `${channel.brightness}%` : 'UNLIT'}</small>
            </div>
            <div className="catalogue-shelf__interior">
              <span className="catalogue-shelf__backwash" aria-hidden="true"/>
              {rowKind === 'catalogues' ? <div className="catalogue-shelf__books catalogue-shelf__books--collection">
                {brandGroups.map((shelfCatalogues, brandIndex) => {
                  const shelfBrand = catalogueBrandOrder[brandIndex];
                  return <div
                    className="catalogue-shelf__highlight-group"
                    data-brand={shelfBrand}
                    style={{'--official-accent': catalogueBrandAccents[shelfBrand]} as CSSProperties}
                    key={shelfBrand}
                  >
                    <span className="catalogue-shelf__brand-tab" aria-hidden="true">
                      <strong>{shelfBrand}</strong>
                      <small>Highlights</small>
                    </span>
                    {shelfCatalogues.map((catalogue, bookIndex) => {
                      const sourceIndex = sourceCatalogues.indexOf(catalogue);
                      const safeSourceIndex = sourceIndex >= 0 ? sourceIndex : bookIndex;
                      const finish = spineFinishes[safeSourceIndex % spineFinishes.length];
                      const textureNumber = String((safeSourceIndex % 14) + 1).padStart(2, '0');
                      const bookStyle = {
                        '--book-cover': finish.cover,
                        '--book-edge': finish.edge,
                        '--book-ink': finish.ink,
                        '--book-page': finish.page,
                        '--book-band': finish.band,
                        '--book-width': `${finish.width}px`,
                        '--book-height': `${finish.height}%`,
                        '--book-depth': `${finish.depth}px`,
                        '--book-lean': `${finish.lean}deg`,
                        '--book-radius': `${finish.radius}px`,
                        '--book-texture': `url("${publicAsset(`assets/generated/official-catalogue-spines/official-spine-${textureNumber}.webp`)}")`,
                        '--official-accent': catalogueBrandAccents[catalogue.brand],
                      } as CSSProperties;
                      const isFaceOutCover = bookIndex === 0 && Boolean(catalogueShelfCover(catalogue));
                      return <Link
                        className={`catalogue-volume catalogue-volume--official${isFaceOutCover ? ' catalogue-volume--faceout' : ''}`}
                        data-brand={catalogue.brand}
                        style={bookStyle}
                        to={catalogueBookLink(catalogue, safeSourceIndex)}
                        aria-label={`Open ${catalogue.name} catalogue`}
                        key={catalogue.id || catalogue.url}
                      >
                        {isFaceOutCover && <CatalogueCoverPreview catalogue={catalogue} variant="shelf"/>}
                        <span
                          className="catalogue-spine"
                          data-material={finish.material}
                          data-layout={finish.layout}
                        >
                          <span className="catalogue-spine__top" aria-hidden="true"/>
                          <span className="catalogue-spine__page-block" aria-hidden="true"/>
                          <span className="catalogue-spine__back-cover" aria-hidden="true"/>
                          <span className="catalogue-spine__front-cover" aria-hidden="true">
                            <span>{brandMark(catalogue.brand)}</span>
                            <strong>{spineCompactTitle(catalogue)}</strong>
                            <small>{spineEdition(catalogue.year)}</small>
                          </span>
                          <span className="catalogue-spine__surface" aria-hidden="true">
                            <span className="catalogue-spine__cover-lines"/>
                            <span className="catalogue-spine__brand">{brandMark(catalogue.brand)}</span>
                            <strong data-compact-title={spineCompactTitle(catalogue)}>{brandMark(catalogue.brand)} {spineCompactTitle(catalogue)}</strong>
                            <span className="catalogue-spine__edition">{spineEdition(catalogue.year)}</span>
                            <span className="catalogue-spine__ornament"/>
                          </span>
                        </span>
                        <span className="catalogue-volume__contact" aria-hidden="true"/>
                      </Link>;
                    })}
                  </div>;
                })}
              </div> : <div className="catalogue-shelf__product-display" aria-hidden="true">
                {shelfDecorations.map(decoration => <span
                  className={`catalogue-shelf__decor catalogue-shelf__decor--${decoration.kind}`}
                  style={{'--decor-image': `url("${publicAsset(decoration.src)}")`} as CSSProperties}
                  data-product-id={decoration.id}
                  data-product-name={decoration.name}
                  key={decoration.id}
                >
                  <img src={publicAsset(decoration.src)} alt=""/>
                  <span className="catalogue-shelf__decor-contact" aria-hidden="true"/>
                </span>)}
              </div>}
              <div
                className="catalogue-mobile-shelf-books"
                aria-label={`Catalogue shelf ${shelfIndex + 1}`}
              >
                {mobileCatalogueRows[shelfIndex].map((catalogue, mobileBookIndex) => {
                  const sourceIndex = sourceCatalogues.indexOf(catalogue);
                  const safeSourceIndex = sourceIndex >= 0 ? sourceIndex : mobileBookIndex;
                  const finish = spineFinishes[safeSourceIndex % spineFinishes.length];
                  const textureNumber = String((safeSourceIndex % 14) + 1).padStart(2, '0');
                  return <Link
                    className="catalogue-mobile-volume"
                    to={catalogueBookLink(catalogue, safeSourceIndex)}
                    aria-label={`Open ${catalogue.name} catalogue`}
                    style={{
                      '--mobile-book-cover': finish.cover,
                      '--mobile-book-edge': finish.edge,
                      '--mobile-book-ink': finish.ink,
                      '--mobile-book-texture': `url("${publicAsset(`assets/generated/official-catalogue-spines/official-spine-${textureNumber}.webp`)}")`,
                      '--official-accent': catalogueBrandAccents[catalogue.brand],
                    } as CSSProperties}
                    key={`mobile-${shelfIndex}-${catalogue.id || catalogue.url}`}
                  >
                    <span aria-hidden="true">
                      <small>{brandMark(catalogue.brand)}</small>
                      <strong>{spineCompactTitle(catalogue)}</strong>
                    </span>
                  </Link>;
                })}
              </div>
            </div>
            <div className="catalogue-shelf__led" aria-hidden="true"/>
            <div className="catalogue-shelf__board" aria-hidden="true"/>
          </div>;
        })}
      </div>

      {isPanelOpen && <button
        className="catalogue-knx-panel__backdrop"
        type="button"
        aria-label="Close expanded KNX wall switch"
        onClick={() => setIsPanelOpen(false)}
      />}
      <aside
        className="catalogue-knx-panel"
        aria-label="KNX shelf lighting wall switch"
        data-expanded={isPanelOpen ? 'true' : 'false'}
        style={{'--knx-colour': activeChannel.color} as CSSProperties}
        onClickCapture={event => {
          if (!isPanelOpen) {
            event.preventDefault();
            event.stopPropagation();
            setIsPanelOpen(true);
          }
        }}
        onKeyDown={event => {
          if (event.key === 'Escape' && isPanelOpen) {
            setIsPanelOpen(false);
          }
        }}
      >
        <div
          id="catalogue-knx-switch-face"
          className="catalogue-knx-panel__wake"
        >
          <span className="catalogue-knx-panel__brand">
            <span><i aria-hidden="true"/> KNX</span>
            <small>WALL CONTROL</small>
          </span>
          <span
            className="catalogue-knx-panel__keys"
            role="group"
            aria-label="Programmed KNX switch buttons"
            aria-hidden={!isPanelOpen}
          >
            {knxSwitchObjects.map((object, index) => <button
              type="button"
              className={activeSwitchKey === index ? 'is-active' : ''}
              aria-label={`KNX key ${index + 1}: ${object.label}`}
              aria-controls="catalogue-knx-screen"
              tabIndex={isPanelOpen ? 0 : -1}
              onClick={() => triggerSwitchObject(index)}
              key={object.label}
            >
              <span className="catalogue-knx-panel__key-mark" aria-hidden="true">
                {object.symbol === 'power' && <Power/>}
                {object.symbol === 'minus' && <Minus/>}
                {object.symbol === 'plus' && <Plus/>}
                {object.symbol === 'colour' && <i
                  style={{'--key-colour': object.faceColor} as CSSProperties}
                />}
                <small>{object.faceLabel}</small>
              </span>
              <span className="sr-only">{object.label}</span>
            </button>)}
          </span>
          <span
            id="catalogue-knx-screen"
            className="catalogue-knx-panel__wake-screen"
            aria-live="polite"
            aria-atomic="true"
          >
            <span>
              <small>{switchFeedback.label}</small>
              <strong>{switchFeedback.value}</strong>
            </span>
            <span className="catalogue-knx-panel__channel-glance" aria-hidden="true">
              {channels.map((channel, index) => <i
                className={activeShelf === index ? 'is-active' : ''}
                style={{
                  '--glance-colour': channel.color,
                  '--glance-strength': channel.power ? channel.brightness / 100 : 0,
                } as CSSProperties}
                key={`glance-${index + 1}`}
              />)}
            </span>
          </span>
          <span
            className="catalogue-knx-panel__mobile-reading"
            aria-label={activeChannel.power
              ? `Shelf LED brightness ${activeChannel.brightness}%`
              : 'Shelf lighting off'}
            aria-hidden={isPanelOpen}
          >
            <small>{activeChannel.power ? 'Brightness' : 'Shelf lighting'}</small>
            <strong>{activeChannel.power ? `${activeChannel.brightness}%` : 'OFF'}</strong>
          </span>
          <button
            className="catalogue-knx-panel__open-hint"
            type="button"
            aria-expanded={isPanelOpen}
            aria-controls="catalogue-knx-switch-face"
            aria-label={`${isPanelOpen ? 'Reduce' : 'Enlarge'} physical KNX wall switch`}
            onClick={() => setIsPanelOpen(open => !open)}
          >
            <span>{isPanelOpen ? 'Reduce switch' : 'Expand switch'}</span>
            {isPanelOpen ? <Minimize2 aria-hidden="true"/> : <Maximize2 aria-hidden="true"/>}
          </button>
        </div>

      </aside>
    </div>

    <div className="catalogue-library-room__controls">
      <div className="catalogue-display-switch" role="group" aria-label="Catalogue display style">
        <span>Display</span>
        <button
          type="button"
          aria-label="Use 3D catalogue view"
          aria-pressed={displayMode === '3d'}
          onClick={() => selectDisplayMode('3d')}
        ><b aria-hidden="true">3D</b> Depth</button>
        <button
          type="button"
          aria-label="Use flat catalogue view"
          aria-pressed={displayMode === 'flat'}
          onClick={() => selectDisplayMode('flat')}
        ><b aria-hidden="true">2D</b> Flat</button>
      </div>
      {filters && <div className="catalogue-library-room__filters">{filters}</div>}
    </div>
  </section>;
}
