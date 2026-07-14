import {useEffect, useRef, useState} from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import {Activity, Gauge, Lightbulb, SunDim} from 'lucide-react';
import {LedSensitivityFilm, type LedSensitivityMode} from '../remotion/LedSensitivityFilm';

const modes: Array<{value: LedSensitivityMode; label: string; detail: string}> = [
  {value: 'auto', label: 'Adaptive', detail: 'Cycles from low to high'},
  {value: 'low', label: 'Low', detail: 'Quiet ambient output'},
  {value: 'high', label: 'High', detail: 'Full task illumination'},
];

export function LedSensitivityPanel() {
  const [mode, setMode] = useState<LedSensitivityMode>('auto');
  const playerRef = useRef<PlayerRef>(null);

  useEffect(() => {
    const playTimer = window.setTimeout(() => playerRef.current?.play(), 120);
    return () => window.clearTimeout(playTimer);
  }, [mode]);

  return <section className="led-lab" aria-labelledby="led-lab-title">
    <div className="led-lab-heading">
      <div><span>02 / RESPONSIVE LIGHTING</span><i><Activity/> SENSOR ACTIVE</i></div>
      <h2 id="led-lab-title">LED light that<br/><em>reads the room.</em></h2>
      <p>See the same installation move from restrained ambient light to full working output. Every change is mapped to the fixture, the surface and the space around it.</p>
    </div>

    <div className="led-lab-player">
      <Player
        ref={playerRef}
        component={LedSensitivityFilm}
        inputProps={{mode}}
        durationInFrames={360}
        compositionWidth={1600}
        compositionHeight={900}
        fps={30}
        loop
        autoPlay
        initiallyMuted
        controls={false}
        clickToPlay={false}
        acknowledgeRemotionLicense
        style={{width: '100%', height: '100%'}}
      />
      <div className="led-lab-fixtures" aria-label="LED fixtures shown">
        <span><SunDim/> Linear cove</span>
        <span><Lightbulb/> Recessed spots</span>
        <span><Gauge/> Wall wash + ring</span>
      </div>
    </div>

    <div className="led-lab-controls" role="group" aria-label="LED sensitivity output">
      {modes.map((item, index) => <button
        type="button"
        className={mode === item.value ? 'active' : ''}
        aria-pressed={mode === item.value}
        onClick={() => setMode(item.value)}
        key={item.value}
      >
        <small>{String(index + 1).padStart(2, '0')}</small>
        <strong>{item.label}</strong>
        <span>{item.detail}</span>
        <i/>
      </button>)}
    </div>
  </section>;
}
