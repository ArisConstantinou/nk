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
  {cover: '#55624d', edge: '#c9bda4', ink: '#f7f0dd'},
  {cover: '#132e54', edge: '#8fa5bf', ink: '#f3f6fb'},
  {cover: '#e8e0cf', edge: '#b7aa92', ink: '#302b25'},
  {cover: '#20374a', edge: '#7f9caf', ink: '#f1f5f6'},
  {cover: '#b57634', edge: '#e0b16b', ink: '#fff7e8'},
  {cover: '#254b50', edge: '#82aaa9', ink: '#f0f7f3'},
  {cover: '#704535', edge: '#d09a72', ink: '#fff3e7'},
  {cover: '#756b61', edge: '#bdb1a4', ink: '#fff9ee'},
  {cover: '#353b3d', edge: '#8d989a', ink: '#f5f6f3'},
  {cover: '#8a3d2d', edge: '#d58e72', ink: '#fff4ec'},
  {cover: '#7d2857', edge: '#c878a3', ink: '#fff0f8'},
  {cover: '#47566a', edge: '#91a0b4', ink: '#f6f8fa'},
  {cover: '#eee8dc', edge: '#bbb09c', ink: '#38332c'},
  {cover: '#5d6251', edge: '#aeb39a', ink: '#f7f5e9'},
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
                  } as CSSProperties;
                  return <Link
                    className="catalogue-spine"
                    to={catalogueBookLink(catalogue, safeSourceIndex)}
                    aria-label={`Open ${catalogue.name} catalogue`}
                    style={bookStyle}
                    key={catalogue.id || catalogue.url}
                  >
                    <span className="catalogue-spine__surface" aria-hidden="true">
                      <span className="catalogue-spine__meta">{brandMark(catalogue.brand)} {spineEdition(catalogue.year)}</span>
                      <strong>{spineTitle(catalogue)}</strong>
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
