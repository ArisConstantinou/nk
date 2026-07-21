import {useState, type CSSProperties} from 'react';
import {
  Activity,
  Blinds,
  Check,
  CirclePower,
  Gauge,
  Lightbulb,
  LockKeyhole,
  Play,
  RotateCcw,
  ShieldCheck,
  Thermometer,
  Zap,
} from 'lucide-react';
import {publicAsset} from '../utils/assets';

type SignatureStyle = CSSProperties & Record<`--${string}`, string | number>;

const temperatures = {
  2700: {label: 'Warm', colour: '#ffb45f', rgb: '255 180 95'},
  3000: {label: 'Soft', colour: '#ffd08a', rgb: '255 208 138'},
  4000: {label: 'Neutral', colour: '#fff1d6', rgb: '255 241 214'},
} as const;
const temperatureOptions = [2700, 3000, 4000] as const;

function SignatureHeading({code, eyebrow, title, body}: {code: string; eyebrow: string; title: string; body: string}) {
  return <header className="service-signature__heading">
    <span>{code} / {eyebrow}</span>
    <h2>{title}</h2>
    <p>{body}</p>
  </header>;
}

function LightingSignature() {
  const [powered, setPowered] = useState(true);
  const [level, setLevel] = useState(74);
  const [temperature, setTemperature] = useState<keyof typeof temperatures>(3000);
  const light = temperatures[temperature];
  const style: SignatureStyle = {
    '--light-level': powered ? level / 100 : 0,
    '--light-colour': light.colour,
    '--light-rgb': light.rgb,
  };

  return <section className={`service-signature service-signature--lighting ${powered ? 'is-live' : ''}`} style={style} aria-label="Interactive concealed lighting study">
    <div className="service-signature__intro">
      <SignatureHeading
        code="SRV-02"
        eyebrow="Live light study"
        title="See the architecture hold the light."
        body="Adjust a concealed linear channel and watch the wall wash, shadow edge and floor reflection respond together."
      />
      <div className="lighting-controls" aria-label="Lighting controls">
        <button type="button" className={powered ? 'is-active' : ''} onClick={() => setPowered(value => !value)} aria-pressed={powered}>
          <CirclePower/><span>{powered ? 'Light on' : 'Light off'}</span>
        </button>
        <label>
          <span>Output <b>{level}%</b></span>
          <input
            aria-label="LED output"
            type="range"
            min="5"
            max="100"
            value={level}
            onInput={event => setLevel(Number(event.currentTarget.value))}
            onChange={event => setLevel(Number(event.currentTarget.value))}
          />
        </label>
        <div className="lighting-temperature" aria-label="Colour temperature">
          {temperatureOptions.map(value => <button
            type="button"
            key={value}
            className={temperature === value ? 'is-active' : ''}
            onClick={() => setTemperature(value)}
            aria-pressed={temperature === value}
          >
            <i style={{background: temperatures[value].colour}}/>{value}K
          </button>)}
        </div>
      </div>
    </div>
    <div className="lighting-study" aria-hidden="true">
      <img className="lighting-study__plate" src={publicAsset('assets/generated/lighting-cove-studio-v2.webp')} alt=""/>
      <div className="lighting-study__wall-bounce"/>
      <div className="lighting-study__floor-bounce"/>
      <div className="lighting-study__object-shadow"/>
      <div className="lighting-study__depth"/>
      <div className="lighting-study__legend">
        <span><i/>Indirect cove</span>
        <strong>{powered ? `${temperature}K · ${light.label} · ${level}%` : 'Circuit off'}</strong>
      </div>
    </div>
  </section>;
}

const automationScenes = {
  morning: {label: 'Morning', light: .55, blind: 18, temperature: 22, security: 'Disarmed', hue: '255 218 156'},
  away: {label: 'Away', light: .08, blind: 82, temperature: 18, security: 'Armed', hue: '123 200 255'},
  evening: {label: 'Evening', light: .9, blind: 72, temperature: 23, security: 'Perimeter', hue: '255 174 96'},
  night: {label: 'Night', light: .18, blind: 100, temperature: 20, security: 'Armed', hue: '101 126 255'},
} as const;

function AutomationSignature() {
  const [scene, setScene] = useState<keyof typeof automationScenes>('evening');
  const active = automationScenes[scene];
  const style: SignatureStyle = {
    '--scene-light': active.light,
    '--blind-position': `${active.blind}%`,
    '--scene-rgb': active.hue,
  };

  return <section className="service-signature service-signature--automation" style={style} aria-label="Interactive automation scene controller">
    <div className="service-signature__intro">
      <SignatureHeading
        code="SRV-03"
        eyebrow="Scene orchestrator"
        title="One action. The whole room responds."
        body="Try a scene to coordinate lighting, shading, climate and security as one calm control strategy."
      />
      <div className="automation-scenes" role="group" aria-label="Select a room scene">
        {(Object.keys(automationScenes) as Array<keyof typeof automationScenes>).map(key => <button
          type="button"
          key={key}
          className={scene === key ? 'is-active' : ''}
          onClick={() => setScene(key)}
          aria-pressed={scene === key}
        >
          <span>{automationScenes[key].label}</span><i/>
        </button>)}
      </div>
    </div>
    <div className="automation-stage">
      <div className="automation-room" aria-hidden="true">
        <div className="automation-room__window"><i/></div>
        <div className="automation-room__pendant"><i/></div>
        <div className="automation-room__sofa"/>
        <span className="automation-room__glow"/>
      </div>
      <div className="automation-readout" aria-live="polite">
        <span><Lightbulb/><small>Lighting</small><strong>{Math.round(active.light * 100)}%</strong></span>
        <span><Blinds/><small>Blinds</small><strong>{active.blind}%</strong></span>
        <span><Thermometer/><small>Climate</small><strong>{active.temperature}°</strong></span>
        <span><LockKeyhole/><small>Security</small><strong>{active.security}</strong></span>
      </div>
    </div>
  </section>;
}

const securityZones = {
  entry: {label: 'Entry', rotation: '-16deg', x: '21%', y: '22%', state: 'Visitor approach covered'},
  perimeter: {label: 'Perimeter', rotation: '68deg', x: '74%', y: '25%', state: 'Boundary movement covered'},
  interior: {label: 'Interior', rotation: '154deg', x: '66%', y: '72%', state: 'Internal circulation covered'},
} as const;

function SecuritySignature() {
  const [zone, setZone] = useState<keyof typeof securityZones>('entry');
  const active = securityZones[zone];
  const style: SignatureStyle = {
    '--camera-angle': active.rotation,
    '--camera-x': active.x,
    '--camera-y': active.y,
  };

  return <section className="service-signature service-signature--security" style={style} aria-label="Interactive security coverage planner">
    <div className="service-signature__intro">
      <SignatureHeading
        code="SRV-04"
        eyebrow="Coverage planner"
        title="Protection starts with what can be seen."
        body="Select a zone to test camera position, coverage overlap and the response path before hardware is fixed."
      />
      <div className="security-zones" role="group" aria-label="Select a security zone">
        {(Object.keys(securityZones) as Array<keyof typeof securityZones>).map(key => <button
          type="button"
          key={key}
          className={zone === key ? 'is-active' : ''}
          onClick={() => setZone(key)}
          aria-pressed={zone === key}
        >
          <ShieldCheck/>{securityZones[key].label}
        </button>)}
      </div>
    </div>
    <div className="security-stage">
      <div className="security-plan" aria-hidden="true">
        <div className="security-plan__room security-plan__room--one">ENTRY</div>
        <div className="security-plan__room security-plan__room--two">LIVING</div>
        <div className="security-plan__room security-plan__room--three">PRIVATE</div>
        <div className="security-plan__camera"><i/><b/></div>
        <span className="security-plan__sweep"/>
      </div>
      <div className="security-status" aria-live="polite">
        <span><i className="is-online"/><small>Selected zone</small><strong>{active.label}</strong></span>
        <span><Activity/><small>Coverage status</small><strong>{active.state}</strong></span>
        <span><LockKeyhole/><small>System route</small><strong>Detect → verify → notify</strong></span>
      </div>
    </div>
  </section>;
}

const diagnosticSteps = [
  {label: 'Supply', reading: '230 V', note: 'Incoming supply is stable.'},
  {label: 'Protection', reading: '30 mA', note: 'RCD responds within tolerance.'},
  {label: 'Circuit', reading: '0.8 Ω', note: 'Continuity is present along the circuit.'},
  {label: 'Load', reading: 'FAULT', note: 'Loose neutral identified at the final load.'},
] as const;

function MaintenanceSignature() {
  const [step, setStep] = useState(0);
  const complete = step >= diagnosticSteps.length;
  const activeIndex = complete ? diagnosticSteps.length - 1 : step;
  const active = diagnosticSteps[activeIndex];

  const advance = () => setStep(value => value >= diagnosticSteps.length ? 0 : value + 1);

  const style: SignatureStyle = {'--trace-progress': Math.min(step / diagnosticSteps.length, 1) * 100};

  return <section className="service-signature service-signature--maintenance" style={style} aria-label="Interactive electrical fault trace">
    <div className="service-signature__intro">
      <SignatureHeading
        code="SRV-05"
        eyebrow="Fault trace"
        title="Test the system. Isolate the cause."
        body="Walk the diagnostic path from supply to load and see how measured evidence narrows a fault."
      />
      <button type="button" className="diagnostic-action" onClick={advance}>
        {complete ? <RotateCcw/> : <Play/>}
        <span>{complete ? 'Reset trace' : step === 0 ? 'Start diagnosis' : 'Run next test'}</span>
      </button>
    </div>
    <div className="diagnostic-stage">
      <div className="diagnostic-route" aria-label="Diagnostic progress">
        {diagnosticSteps.map((item, index) => {
          const passed = step > index;
          const current = !complete && step === index;
          const fault = passed && index === diagnosticSteps.length - 1;
          return <div className={`${passed ? 'is-tested' : ''} ${current ? 'is-current' : ''} ${fault ? 'is-fault' : ''}`} key={item.label}>
            <span>{fault ? '!' : passed ? <Check/> : index + 1}</span>
            <small>{item.label}</small>
            <strong>{passed || current ? item.reading : '—'}</strong>
          </div>;
        })}
      </div>
      <div className={`diagnostic-meter ${complete ? 'is-fault' : ''}`} aria-live="polite">
        <Gauge/>
        <span><small>{complete ? 'Fault isolated' : `Test ${activeIndex + 1} of ${diagnosticSteps.length}`}</small><strong>{complete ? 'Loose neutral' : active.label}</strong></span>
        <p>{complete ? diagnosticSteps.at(-1)?.note : step === 0 ? 'Begin with a known supply, then move downstream.' : diagnosticSteps[step - 1]?.note}</p>
      </div>
    </div>
  </section>;
}

function InstallationSignature() {
  return <section className="service-signature service-signature--installation" aria-label="Electrical installation route">
    <div className="service-signature__intro">
      <SignatureHeading
        code="SRV-01"
        eyebrow="Circuit route"
        title="Plan the load before pulling the cable."
        body="A compact route from incoming supply to protected final circuits."
      />
    </div>
    <div className="installation-route">
      {['Supply', 'Distribution', 'Protection', 'Final circuit'].map((label, index) => <span key={label}><i>{index === 0 ? <Zap/> : index + 1}</i><small>{label}</small></span>)}
    </div>
  </section>;
}

export function ServiceSignature({slug}: {slug: string}) {
  if (slug === 'lighting-design') return <LightingSignature/>;
  if (slug === 'smart-home-automation') return <AutomationSignature/>;
  if (slug === 'security-systems') return <SecuritySignature/>;
  if (slug === 'maintenance') return <MaintenanceSignature/>;
  return <InstallationSignature/>;
}
