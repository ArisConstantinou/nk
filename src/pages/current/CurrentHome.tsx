import {useState} from 'react';
import {motion} from 'framer-motion';
import {ArrowDown, ArrowRight, Building2, Check, CircuitBoard, Gauge, Home, Lightbulb, PlugZap, RefreshCw, ShieldCheck, Store, Wrench, Zap} from 'lucide-react';
import {Link} from 'react-router-dom';
import {LedSensitivityPanel} from '../../components/LedSensitivityPanel';
import {useContent} from '../../context/ContentContext';
import {publicAsset} from '../../utils/assets';

const situations = [
  {number: '01', label: 'New build', title: 'Plan before walls close.', body: 'Load, distribution, lighting and controls coordinated around the drawings.', route: '/electrical-installations', Icon: Building2},
  {number: '02', label: 'Renovation', title: 'Keep what works. Fix what does not.', body: 'Survey the existing installation, define upgrades and sequence the work.', route: '/contact?brief=renovation', Icon: RefreshCw},
  {number: '03', label: 'Lighting', title: 'Test the atmosphere first.', body: 'Explore colour, output and movement before choosing the final lighting layers.', route: '/#led-lab', Icon: Lightbulb},
  {number: '04', label: 'Fault or upgrade', title: 'Get to the right technician faster.', body: 'Describe the symptom, equipment and property so the enquiry arrives with context.', route: '/contact?brief=support', Icon: Wrench},
];

const projectStarts = [
  {label: 'A home', route: '/contact?brief=home', Icon: Home},
  {label: 'A workplace', route: '/contact?brief=workplace', Icon: Building2},
  {label: 'Retail / hospitality', route: '/contact?brief=retail', Icon: Store},
  {label: 'An existing fault', route: '/contact?brief=support', Icon: Wrench},
];

const checkpoints = [
  {number: '01', title: 'Understand', body: 'Site, drawings, loads, priorities and constraints.'},
  {number: '02', title: 'Coordinate', body: 'Power, lighting, equipment and control decisions connected.'},
  {number: '03', title: 'Install', body: 'A practical sequence with one accountable team.'},
  {number: '04', title: 'Verify', body: 'Protection, operation and handover checked before switch-on.'},
];

const projects = [
  {name: 'Bank of Cyprus Head Offices', type: 'Commercial power + LED', image: 'assets/projects/archive/project-01.jpg'},
  {name: 'Private Residence', type: 'Residential systems + lighting', image: 'assets/projects/archive/project-02.jpg'},
  {name: 'Mixed-use Building', type: 'Homes + offices + retail', image: 'assets/projects/archive/project-03.jpg'},
];

function EnergyPlanner() {
  const [watts, setWatts] = useState(800);
  const [hours, setHours] = useState(5);
  const [rate, setRate] = useState(0.34);
  const dailyKwh = watts * hours / 1000;
  const monthlyCost = dailyKwh * 30 * rate;

  return <section className="current-energy-tool" aria-labelledby="energy-tool-title">
    <div className="current-energy-heading">
      <span>QUICK TOOL / ENERGY USE</span>
      <h2 id="energy-tool-title">Turn watts into<br/><em>a useful estimate.</em></h2>
      <p>Use the equipment rating and expected run time to understand daily energy use before comparing options.</p>
    </div>
    <div className="current-energy-controls">
      <label>Equipment load <span><input type="number" min="1" value={watts} aria-label="Equipment load in watts" onChange={event => setWatts(Math.max(1, Number(event.target.value)))}/> W</span></label>
      <label>Use per day <span><input type="number" min="0.1" max="24" step="0.5" value={hours} aria-label="Hours used per day" onChange={event => setHours(Math.max(.1, Math.min(24, Number(event.target.value))))}/> hours</span></label>
      <label>Energy rate <span>€ <input type="number" min="0.01" step="0.01" value={rate} aria-label="Energy rate per kilowatt hour" onChange={event => setRate(Math.max(.01, Number(event.target.value)))}/> / kWh</span></label>
    </div>
    <div className="current-energy-output" aria-live="polite">
      <div><small>Daily energy</small><output>{dailyKwh.toFixed(2)}</output><span>kWh / day</span></div>
      <div><small>30-day estimate</small><output>€{monthlyCost.toFixed(2)}</output><span>at the rate entered</span></div>
      <p><Gauge/> Planning estimate only. Actual consumption varies with controls, duty cycles and equipment efficiency.</p>
    </div>
  </section>;
}

export default function CurrentHome() {
  const {content} = useContent();
  const theme = content.themeContent.flow;

  return <div className="current-home">
    <section className="current-hero">
      <div className="current-hero-copy">
        <motion.span className="current-kicker" initial={{opacity: 0, y: 12}} animate={{opacity: 1, y: 0}}>{theme.eyebrow}</motion.span>
        <motion.h1 initial={{opacity: 0, y: 28}} animate={{opacity: 1, y: 0}} transition={{duration: .7}}>{theme.heroTitle}<br/><em>{theme.heroAccent}</em></motion.h1>
        <p>{theme.heroBody}</p>
        <div className="current-hero-actions">
          <Link className="current-button current-button--primary" to="/contact">Build a project brief <ArrowRight/></Link>
          <Link className="current-button current-button--quiet" to="/#led-lab">Try the LED test <Lightbulb/></Link>
        </div>
        <div className="current-hero-promise"><Check/><span>{theme.heroTail}</span></div>
      </div>

      <aside className="current-project-starter" aria-label="Choose a project starting point">
        <header><span>PROJECT STARTER</span><strong>What are we powering?</strong><small>Choose the closest starting point. You can refine it in the brief.</small></header>
        <nav>{projectStarts.map(({label, route, Icon}, index) => <Link to={route} key={label}><span>{String(index + 1).padStart(2, '0')}</span><Icon/><strong>{label}</strong><ArrowRight/></Link>)}</nav>
        <footer><span><i/> ENQUIRY ROUTING ACTIVE</span><b>Right context.<br/>Right specialist.</b></footer>
      </aside>
    </section>

    <section className="current-live-strip" aria-label="NK Electrical service status">
      <div><span>01</span><small>Electrical installations</small><strong>Plan → test</strong></div>
      <div><span>02</span><small>Lighting</small><strong>Layer → tune</strong></div>
      <div><span>03</span><small>Controls</small><strong>Connect → adapt</strong></div>
      <div><span>04</span><small>Support</small><strong>Find → resolve</strong></div>
      <p><Zap/> One team owns the hand-offs.</p>
    </section>

    <section className="current-situations">
      <header>
        <span>START HERE / NOT IN A MENU</span>
        <h2>{theme.sectionTitle}</h2>
        <p>{theme.sectionBody}</p>
      </header>
      <div className="current-situation-grid">{situations.map(({number, label, title, body, route, Icon}) => <Link className="current-situation-card" to={route} key={number}>
        <span>{number} / {label}</span><Icon/><h3>{title}</h3><p>{body}</p><b>Take this path <ArrowRight/></b>
      </Link>)}</div>
    </section>

    <LedSensitivityPanel/>

    <EnergyPlanner/>

    <section className="current-electricity-guide">
      <header><span>ELECTRICITY / THE USEFUL VERSION</span><h2>Three decisions behind a dependable installation.</h2></header>
      <div>
        <article><span>01</span><PlugZap/><h3>Load</h3><p>How much power the building and equipment need now—and what future demand should be allowed for.</p><small>Demand · diversity · distribution</small></article>
        <article><span>02</span><ShieldCheck/><h3>Protection</h3><p>How circuits isolate faults, protect people and equipment, and make maintenance safer.</p><small>RCD · breakers · earthing</small></article>
        <article><span>03</span><CircuitBoard/><h3>Control</h3><p>How lighting, security and automation respond without making the building difficult to use.</p><small>Scenes · sensors · KNX</small></article>
      </div>
    </section>

    <section className="current-process">
      <div className="current-process-copy"><span>ONE BRIEF / FOUR CHECKPOINTS</span><h2>Progress should be visible before the cables are.</h2><p>Every checkpoint produces a clearer next decision, so the project does not disappear into a black box.</p><Link to="/electrical-installations">See how installations are delivered <ArrowRight/></Link></div>
      <ol>{checkpoints.map(({number, title, body}) => <li key={number}><span>{number}</span><div><strong>{title}</strong><p>{body}</p></div><Check/></li>)}</ol>
    </section>

    <section className="current-project-proof">
      <header><div><span>COMPLETED / NOT CONCEPTUAL</span><h2>Proof from real buildings.</h2></div><Link to="/projects">Open the project archive <ArrowRight/></Link></header>
      <div>{projects.map(({name, type, image}, index) => <Link to="/projects" key={name}><img src={publicAsset(image)} alt={name}/><span>0{index + 1}</span><div><strong>{name}</strong><small>{type}</small></div><ArrowRight/></Link>)}</div>
    </section>
  </div>;
}
