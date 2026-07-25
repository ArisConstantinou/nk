import {useState, type CSSProperties} from 'react';
import {Lightbulb, Power, SlidersHorizontal, Sparkles} from 'lucide-react';
import {Link} from 'react-router-dom';
import type {Catalogue} from '../types';
import {publicAsset} from '../utils/assets';
import {catalogueBookLink} from './UnifiedCatalogueBook';

type ShelfLightChannel = {
  color: string;
  brightness: number;
  power: boolean;
};

type CatalogueBookshelfProps = {
  catalogues: Catalogue[];
  sourceCatalogues: Catalogue[];
};

const shelfCount = 5;
const initialCapacity = 3;

const defaultChannels: ShelfLightChannel[] = [
  {color: '#e7b67b', brightness: 78, power: true},
  {color: '#e7b67b', brightness: 74, power: true},
  {color: '#e7b67b', brightness: 70, power: true},
  {color: '#e7b67b', brightness: 68, power: true},
  {color: '#e7b67b', brightness: 72, power: true},
];

const colourPresets = ['#e7b67b', '#52dfff', '#ad7cff', '#ff6f91', '#80e58f'];

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
  const shelves = Array.from({length: shelfCount}, () => [] as Catalogue[]);
  catalogues.forEach((catalogue, index) => {
    const shelfIndex = index < shelfCount * initialCapacity
      ? Math.floor(index / initialCapacity)
      : (index - shelfCount * initialCapacity) % shelfCount;
    shelves[shelfIndex].push(catalogue);
  });
  return shelves;
};

export function CatalogueBookshelf({catalogues, sourceCatalogues}: CatalogueBookshelfProps) {
  const [channels, setChannels] = useState<ShelfLightChannel[]>(defaultChannels);
  const [activeShelf, setActiveShelf] = useState(0);
  const shelves = distributeCatalogues(catalogues);
  const activeChannel = channels[activeShelf];

  const patchActiveChannel = (patch: Partial<ShelfLightChannel>) => {
    setChannels(current => current.map((channel, index) => (
      index === activeShelf ? {...channel, ...patch} : channel
    )));
  };

  return <section className="catalogue-library-room section" aria-labelledby="catalogue-library-room-title">
    <div className="catalogue-library-room__heading">
      <div>
        <span><Sparkles/> THE READING ROOM</span>
        <h2 id="catalogue-library-room-title">Choose a spine.<br/><em>Open the collection.</em></h2>
      </div>
      <p>Each labelled spine opens immediately in the shared page-turning reader. Hover, focus or tap a book to lift it from the shelf.</p>
    </div>

    <div className="catalogue-library-room__scene">
      <div className="catalogue-bookcase" aria-label="Five illuminated catalogue shelves">
        <div className="catalogue-bookcase__crown"><span>NK</span><small>CATALOGUE LIBRARY</small></div>
        {shelves.map((shelfCatalogues, shelfIndex) => {
          const channel = channels[shelfIndex];
          const lightStrength = channel.power ? channel.brightness / 100 : 0;
          const shelfStyle = {
            '--shelf-light': channel.color,
            '--shelf-glow': hexToRgba(channel.color, lightStrength * 0.68),
            '--shelf-wash': hexToRgba(channel.color, lightStrength * 0.22),
          } as CSSProperties;

          return <div
            className={`catalogue-shelf${activeShelf === shelfIndex ? ' is-active' : ''}`}
            data-shelf={shelfIndex + 1}
            data-power={channel.power ? 'on' : 'off'}
            style={shelfStyle}
            key={`shelf-${shelfIndex + 1}`}
          >
            <div className="catalogue-shelf__number">
              <span>{String(shelfIndex + 1).padStart(2, '0')}</span>
              <small>{channel.power ? `${channel.brightness}%` : 'OFF'}</small>
            </div>
            <div className="catalogue-shelf__interior">
              <div className="catalogue-shelf__books">
                {shelfCatalogues.map((catalogue, bookIndex) => {
                  const sourceIndex = sourceCatalogues.indexOf(catalogue);
                  const safeSourceIndex = sourceIndex >= 0 ? sourceIndex : bookIndex;
                  const finish = spineFinishes[safeSourceIndex % spineFinishes.length];
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
                  } as CSSProperties;
                  return <Link
                    className="catalogue-spine"
                    to={catalogueBookLink(catalogue, safeSourceIndex)}
                    aria-label={`Open ${catalogue.name} catalogue`}
                    data-material={finish.material}
                    data-layout={finish.layout}
                    style={bookStyle}
                    key={catalogue.id || catalogue.url}
                  >
                    <span className="catalogue-spine__surface" aria-hidden="true">
                      <span className="catalogue-spine__cover-lines"/>
                      <span className="catalogue-spine__brand">{brandMark(catalogue.brand)}</span>
                      <strong data-compact-title={spineCompactTitle(catalogue)}>{spineTitle(catalogue)}</strong>
                      <span className="catalogue-spine__edition">{spineEdition(catalogue.year)}</span>
                      <span className="catalogue-spine__ornament"/>
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

      <aside
        className="catalogue-shelf-remote"
        aria-labelledby="catalogue-remote-title"
        style={{'--remote-colour': activeChannel.color} as CSSProperties}
      >
        <img className="catalogue-shelf-remote__shell" src={publicAsset('assets/generated/nk-rgb-remote-shell-transparent.webp')} alt="" aria-hidden="true"/>
        <h3 id="catalogue-remote-title">Shelf light remote</h3>
        <button
          className="catalogue-shelf-remote__power"
          type="button"
          aria-label={`${activeChannel.power ? 'Turn off' : 'Turn on'} shelf ${activeShelf + 1} light`}
          aria-pressed={activeChannel.power}
          onClick={() => patchActiveChannel({power: !activeChannel.power})}
        >
          <Power/><span>{activeChannel.power ? 'ON' : 'OFF'}</span>
        </button>

        <div className="catalogue-shelf-remote__wheel" aria-label="Shelf light colour presets">
          <span aria-hidden="true"/>
          <div>
            {colourPresets.map(colour => <button
              type="button"
              aria-label={`Set shelf ${activeShelf + 1} light to ${colour}`}
              aria-pressed={activeChannel.color === colour}
              style={{'--preset-colour': colour} as CSSProperties}
              onClick={() => patchActiveChannel({color: colour, power: true})}
              key={colour}
            />)}
          </div>
        </div>

        <div className="catalogue-shelf-remote__channels" role="group" aria-label="Choose shelf to control">
          {channels.map((channel, index) => <button
            type="button"
            className={activeShelf === index ? 'is-active' : ''}
            aria-label={`Control shelf ${index + 1}`}
            aria-pressed={activeShelf === index}
            style={{'--channel-colour': channel.color} as CSSProperties}
            onClick={() => setActiveShelf(index)}
            key={`channel-${index + 1}`}
          ><span>{String(index + 1).padStart(2, '0')}</span></button>)}
        </div>

        <label className="catalogue-shelf-remote__brightness">
          <span><SlidersHorizontal/> Brightness</span>
          <input
            type="range"
            min="10"
            max="100"
            value={activeChannel.brightness}
            aria-label={`Shelf ${activeShelf + 1} brightness`}
            onChange={event => patchActiveChannel({brightness: Number(event.target.value), power: true})}
          />
        </label>

        <div className="catalogue-shelf-remote__status" aria-live="polite">
          <Lightbulb/>
          <span>SHELF {String(activeShelf + 1).padStart(2, '0')}</span>
          <strong>{activeChannel.power ? `${activeChannel.brightness}%` : 'OFF'}</strong>
        </div>
      </aside>
    </div>
  </section>;
}
