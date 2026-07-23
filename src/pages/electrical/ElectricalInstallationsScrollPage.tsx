import {useEffect, useRef, useState, type CSSProperties} from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import {ArrowDown, ArrowRight, CheckCircle2, Zap} from 'lucide-react';
import {Link} from 'react-router-dom';
import {useMotionPreference} from '../../interactive/react/useMotionPreference';
import {
  ElectricalInstallationFilm,
  INSTALLATION_STAGE_FRAMES,
  INSTALLATION_STORY_DURATION,
} from '../../remotion/ElectricalInstallationFilm';
import {publicAsset} from '../../utils/assets';
import './electrical-installations-story.css';

type ElectricalInstallationsScrollPageProps = {
  title: string;
  description: string;
  actionLabel: string;
};

const stages = [
  {label: 'Site review', title: 'Review the existing conditions.', copy: 'We confirm the room, drawings, supply, access and intended use before installation starts.', asset: '01-rough-wall.webp', focal: 50},
  {label: 'Set out', title: 'Measure and mark the agreed positions.', copy: 'Switches, sockets, lighting points and cable routes are confirmed on site before cutting begins.', asset: '02-marking.webp', focal: 34},
  {label: 'First fix', title: 'Prepare routes and back-box positions.', copy: 'Chases and recesses follow the approved layout, safe zones and required depths.', asset: '03-chases.webp', focal: 50},
  {label: 'Containment', title: 'Install protected cable routes.', copy: 'Conduit and containment connect distribution, control points and final outlets while keeping the installation serviceable.', asset: '04-conduit.webp', focal: 50},
  {label: 'Cabling', title: 'Pull, identify and prepare conductors.', copy: 'Conductors are installed through the prepared routes, identified and left ready for termination.', asset: '05-wiring.webp', focal: 78},
  {label: 'Inspection', title: 'Check the first fix before closing walls.', copy: 'Routes, boxes and cabling are checked against the agreed layout before plaster and finishes are restored.', asset: '06-patch-paint.webp', focal: 50},
  {label: 'Second fix', title: 'Fit accessories and complete connections.', copy: 'Sockets, switches, luminaires and controls are installed level, secure and ready for testing.', asset: '07-fittings.webp', focal: 50},
  {label: 'Handover', title: 'Inspect, test and demonstrate the system.', copy: 'Circuits and controls are verified, operation is explained and the completed installation is handed over.', asset: '08-lights-on.webp', focal: 50},
] as const;

const stageImages = stages.map(stage => publicAsset(`assets/generated/electrical-installation-story/${stage.asset}`));
const desktopFocalPoints = stages.map(stage => stage.focal);
const mobileFocalPoints = [50, 34, 50, 50, 78, 50, 50, 50];

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function ReducedInstallationStory() {
  return <section className="installation-story__reduced" aria-label="Electrical installation stages">
    {stages.map((stage, index) => <article key={stage.label}>
      <img src={stageImages[index]} alt="" loading={index > 1 ? 'lazy' : 'eager'}/>
      <div><span>{String(index + 1).padStart(2, '0')} / 08 / {stage.label}</span><h2>{stage.title}</h2><p>{stage.copy}</p></div>
    </article>)}
  </section>;
}

export function ElectricalInstallationsScrollPage({title, description, actionLabel}: ElectricalInstallationsScrollPageProps) {
  const motionPreference = useMotionPreference();
  const playerRef = useRef<PlayerRef>(null);
  const timelineRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const activeStageRef = useRef(0);
  const [activeStage, setActiveStage] = useState(0);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width:720px)').matches);

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.installationStory;
    root.dataset.installationStory = 'active';
    return () => {
      if (previous) root.dataset.installationStory = previous;
      else delete root.dataset.installationStory;
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width:720px)');
    const update = () => setIsMobile(media.matches);
    media.addEventListener('change', update);
    update();
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (motionPreference === 'reduced') return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const timeline = timelineRef.current;
      if (!timeline) return;
      const rootStyle = getComputedStyle(document.documentElement);
      const headerHeight = Number.parseFloat(rootStyle.getPropertyValue('--command-height')) || 90;
      const rect = timeline.getBoundingClientRect();
      const stickyHeight = Math.max(1, window.innerHeight - headerHeight);
      const travel = Math.max(1, rect.height - stickyHeight);
      const progress = clamp01((headerHeight - rect.top) / travel);
      const frame = Math.round(progress * (INSTALLATION_STORY_DURATION - 1));
      const nextStage = Math.min(stages.length - 1, Math.round(frame / INSTALLATION_STAGE_FRAMES));
      playerRef.current?.pause();
      playerRef.current?.seekTo(frame);
      viewportRef.current?.style.setProperty('--story-progress', progress.toFixed(4));
      if (nextStage !== activeStageRef.current) {
        activeStageRef.current = nextStage;
        setActiveStage(nextStage);
      }
    };
    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    schedule();
    window.addEventListener('scroll', schedule, {passive: true});
    window.addEventListener('resize', schedule);
    return () => {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [isMobile, motionPreference]);

  const active = stages[activeStage];
  const heroStyle = {'--installation-hero': `url("${stageImages[0]}")`} as CSSProperties;

  return <div className="installation-story">
    <section className="installation-story__hero" style={heroStyle} aria-labelledby="installation-story-title">
      <div className="installation-story__hero-shade" aria-hidden="true"/>
      <div className="installation-story__hero-copy">
        <span><Zap/> NK / ELECTRICAL INSTALLATIONS / CYPRUS</span>
        <h1 id="installation-story-title">From site review,<br/><em>through wiring</em><br/>to tested handover.</h1>
        <p>{description}</p>
      </div>
      <div className="installation-story__scroll-cue"><ArrowDown/><span>Scroll through the work</span><i/></div>
    </section>

    <section className="installation-story__manifesto" aria-label="Installation principle">
      <span>THE WORK FROM FIRST FIX TO HANDOVER</span>
      <h2>A clear electrical installation <em>follows a tested sequence.</em><br/>Each stage is checked before the next begins.</h2>
      <p>Follow the site review, setting out, first fix, second fix, testing and handover.</p>
    </section>

    {motionPreference === 'reduced' ? <ReducedInstallationStory/> : <section className="installation-story__timeline" ref={timelineRef} aria-label="Scroll through the electrical installation">
      <div className="installation-story__viewport" ref={viewportRef} style={{'--story-progress': 0} as CSSProperties}>
        <div className="installation-story__film" aria-hidden="true">
          <Player
            key={isMobile ? 'installation-mobile' : 'installation-desktop'}
            ref={playerRef}
            component={ElectricalInstallationFilm}
            inputProps={{images: stageImages, focalPoints: isMobile ? mobileFocalPoints : desktopFocalPoints}}
            durationInFrames={INSTALLATION_STORY_DURATION}
            compositionWidth={isMobile ? 1080 : 1920}
            compositionHeight={isMobile ? 1920 : 1080}
            fps={30}
            autoPlay={false}
            loop={false}
            initiallyMuted
            controls={false}
            clickToPlay={false}
            acknowledgeRemotionLicense
            style={{width: '100%', height: '100%'}}
          />
        </div>

        <header className="installation-story__local-nav">
          <span><Zap/> {title}</span>
          <span>NICOSIA / CYPRUS</span>
        </header>

        <div className="installation-story__chapter" key={active.label}>
          <span>{String(activeStage + 1).padStart(2, '0')} / 08 / {active.label}</span>
          <h2>{active.title}</h2>
          <p>{active.copy}</p>
        </div>

        <div className="installation-story__progress" aria-hidden="true">
          <i><b/></i>
          <ol>{stages.map((stage, index) => <li className={index <= activeStage ? 'active' : ''} key={stage.label}><span>{String(index + 1).padStart(2, '0')}</span><b>{stage.label}</b></li>)}</ol>
        </div>
      </div>
    </section>}

    <section className="installation-story__outcome" aria-labelledby="installation-outcome-title">
      <img src={stageImages[7]} alt="Completed electrical installation with four warm wall lights" loading="lazy"/>
      <div className="installation-story__outcome-shade" aria-hidden="true"/>
      <div>
        <span><CheckCircle2/> INSPECTED / TESTED / HANDED OVER</span>
        <h2 id="installation-outcome-title">From initial site review.<br/><em>To a tested installation.</em></h2>
        <p>Share the property, project stage, drawings and target timing. We review the brief and confirm the next survey or scope call.</p>
        <Link to="/request-a-quote?service=electrical-installations"><span>{actionLabel}</span><ArrowRight/></Link>
      </div>
    </section>
  </div>;
}
