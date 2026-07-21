import {useEffect, useState} from 'react';
import {Player} from '@remotion/player';
import {QuoteScopeFilm} from '../remotion/QuoteScopeFilm';

export function QuoteScopePlayer() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return <div className="quote-scope-player" aria-hidden="true">
    <Player
      component={QuoteScopeFilm}
      durationInFrames={240}
      compositionWidth={900}
      compositionHeight={520}
      fps={30}
      loop={!reducedMotion}
      autoPlay={!reducedMotion}
      initialFrame={reducedMotion ? 165 : 0}
      controls={false}
      initiallyMuted
      numberOfSharedAudioTags={0}
      acknowledgeRemotionLicense
      style={{width: '100%', height: '100%'}}
    />
  </div>;
}
