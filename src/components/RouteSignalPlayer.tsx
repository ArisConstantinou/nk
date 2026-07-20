import {Player} from '@remotion/player';
import {useMotionPreference} from '../interactive/react/useMotionPreference';
import {RouteSignalFilm} from '../remotion/RouteSignalFilm';
import {routeInteractionForPath} from '../routeInteractions';
import '../route-interactions.css';

export function RouteSignalPlayer({path, signalKey}: {path: string; signalKey: number}) {
  const motionPreference = useMotionPreference();
  const profile = routeInteractionForPath(path);

  return <div
    className="ia-route-signal"
    data-route-signal={profile.motion}
    data-route-signal-key={signalKey}
    aria-hidden="true"
  >
    <Player
      key={`${path}-${signalKey}-${motionPreference}`}
      component={RouteSignalFilm}
      inputProps={{profile}}
      durationInFrames={54}
      compositionWidth={1200}
      compositionHeight={32}
      fps={30}
      autoPlay={motionPreference === 'full'}
      initiallyMuted
      controls={false}
      clickToPlay={false}
      acknowledgeRemotionLicense
      style={{width: '100%', height: '100%', overflow: 'hidden', background: 'transparent'}}
    />
  </div>;
}
