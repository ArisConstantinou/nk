import {useEffect, useRef} from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import {BrandEnergyFilm} from '../remotion/BrandEnergyFilm';
import {useMotionPreference} from '../interactive/react/useMotionPreference';
import {ResponsiveImage} from './ResponsiveImage';

type BrandEnergyMarkProps = {
  src: string;
  alt: string;
};

export function BrandEnergyMark({src, alt}: BrandEnergyMarkProps) {
  const playerRef = useRef<PlayerRef>(null);
  const motionPreference = useMotionPreference();
  const shouldAnimate = motionPreference === 'full';

  useEffect(() => {
    if (shouldAnimate) {
      playerRef.current?.seekTo(0);
      playerRef.current?.play();
      return;
    }

    playerRef.current?.pause();
    playerRef.current?.seekTo(0);
  }, [shouldAnimate]);

  return <span className="ia-brand-mark">
    <span className="ia-brand-wires" aria-hidden="true">
      <Player
        ref={playerRef}
        component={BrandEnergyFilm}
        durationInFrames={180}
        compositionWidth={180}
        compositionHeight={62}
        fps={30}
        autoPlay={shouldAnimate}
        loop
        initiallyMuted
        controls={false}
        clickToPlay={false}
        acknowledgeRemotionLicense
        style={{width: '100%', height: '100%', overflow: 'visible', background: 'transparent'}}
      />
    </span>
    <ResponsiveImage className="ia-brand-logo" src={src} alt={alt}/>
  </span>;
}
