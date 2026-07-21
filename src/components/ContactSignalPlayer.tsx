import {useEffect, useState} from 'react';
import {Player} from '@remotion/player';
import {ContactSignalFilm} from '../remotion/ContactSignalFilm';

export function ContactSignalPlayer({compact = false}: {compact?: boolean}) {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return <div className={`contact-signal-player${compact ? ' contact-signal-player--compact' : ''}`} aria-hidden="true">
    <Player
      component={ContactSignalFilm}
      durationInFrames={240}
      compositionWidth={900}
      compositionHeight={520}
      fps={30}
      loop={!reducedMotion}
      autoPlay={!reducedMotion}
      initialFrame={reducedMotion ? 150 : 0}
      controls={false}
      initiallyMuted
      numberOfSharedAudioTags={0}
      acknowledgeRemotionLicense
      style={{width: '100%', height: '100%'}}
    />
  </div>;
}
