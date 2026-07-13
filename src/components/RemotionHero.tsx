import {Player} from '@remotion/player';
import {EnergyFilm} from '../remotion/EnergyFilm';

export function RemotionHero() {
  return <div className="energy-player" aria-hidden="true">
    <Player component={EnergyFilm} durationInFrames={180} compositionWidth={900} compositionHeight={620} fps={30} loop autoPlay controls={false} style={{width:'100%', height:'100%'}} />
  </div>;
}
