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
  {color: '#ffb45f', brightness: 78, power: true},
  {color: '#52dfff', brightness: 74, power: true},
  {color: '#ad7cff', brightness: 70, power: true},
  {color: '#ff6f91', brightness: 68, power: true},
  {color: '#80e58f', brightness: 72, power: true},
];

const colourPresets = ['#ffb45f', '#52dfff', '#ad7cff', '#ff6f91', '#80e58f'];

const spinePalettes = [
  {cover: '#b94f35', edge: '#ef9b6a', ink: '#fff4e7'},
  {cover: '#173f4b', edge: '#5fb8bd', ink: '#e6ffff'},
  {cover: '#5b355e', edge: '#c58ebd', ink: '#fff0fb'},
  {cover: '#79552f', edge: '#d4a45f', ink: '#fff5df'},
  {cover: '#285044', edge: '#76a995', ink: '#edfff7'},
  {cover: '#30384b', edge: '#7888b1', ink: '#f0f3ff'},
];

const shelfDecor = [
  {
    image: 'assets/catalogue-products/lighting/cutouts/table-led-light.webp',
    label: 'Modern table light',
    className: 'is-table-light',
  },
  {
    image: 'assets/catalogue-products/lighting/cutouts/wave-led-pendant-light.webp',
    label: 'Wave LED light',
    className: 'is-wave-light',
  },
  {
    image: 'assets/catalogue-products/lighting/cutouts/e27.webp',
    label: 'E27 lamp holder display',
    className: 'is-lamp-holder',
  },
  {
    image: 'assets/catalogue-products/lighting/cutouts/flexible-led-panels.webp',
    label: 'Flexible LED panel',
    className: 'is-flex-panel',
  },
  {
    image: 'assets/catalogue-products/lighting/cutouts/table-led-light-8.webp',
    label: 'Bendable reading light',
    className: 'is-bendable-light',
  },
];

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
      <p>Each book opens immediately in the shared page-turning reader. Hover or focus a spine to pull it from the shelf.</p>
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
                  const palette = spinePalettes[safeSourceIndex % spinePalettes.length];
                  const bookStyle = {
                    '--book-cover': palette.cover,
                    '--book-edge': palette.edge,
                    '--book-ink': palette.ink,
                    '--book-lean': `${(bookIndex % 3 - 1) * 1.4}deg`,
                  } as CSSProperties;
                  return <Link
                    className="catalogue-spine"
                    to={catalogueBookLink(catalogue, safeSourceIndex)}
                    aria-label={`Open ${catalogue.name} catalogue`}
                    title={`${catalogue.name} · ${catalogue.brand} · ${catalogue.year}`}
                    style={bookStyle}
                    key={catalogue.id || catalogue.url}
                  >
                    <span className="catalogue-spine__brand">{catalogue.brand}</span>
                    <strong>{catalogue.name}</strong>
                    <span className="catalogue-spine__year">{catalogue.year}</span>
                    <i aria-hidden="true"/>
                  </Link>;
                })}
                {shelfCatalogues.length < initialCapacity && <div className="catalogue-shelf__future" aria-label="Space reserved for a future catalogue">
                  <span>+</span><small>FUTURE<br/>COLLECTION</small>
                </div>}
              </div>
              <div className={`catalogue-shelf__decor ${shelfDecor[shelfIndex].className}`}>
                <img src={publicAsset(shelfDecor[shelfIndex].image)} alt={shelfDecor[shelfIndex].label}/>
                <span aria-hidden="true"/>
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
