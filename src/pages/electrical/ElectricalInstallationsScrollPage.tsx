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
  {label: 'Raw structure', title: 'Start with what is real.', copy: 'An uneven masonry wall. A clean concrete datum. Nothing hidden.', asset: '01-rough-wall.webp', focal: 50},
  {label: 'Mark', title: 'Measure. Mark. Commit.', copy: 'Every switch, socket and lighting point finds its exact line before the wall is touched.', asset: '02-marking.webp', focal: 34},
  {label: 'Chase', title: 'Cut only with purpose.', copy: 'Straight chases, controlled depth and safe zones turn the drawing into architecture.', asset: '03-chases.webp', focal: 50},
  {label: 'Conduit', title: 'Build the pathways.', copy: 'Conduit creates a protected, serviceable route through the structure.', asset: '04-conduit.webp', focal: 50},
  {label: 'Wire', title: 'Pull the conductors.', copy: 'Modern harmonised wiring is identified, protected and prepared for precise termination.', asset: '05-wiring.webp', focal: 78},
  {label: 'Finish', title: 'Make the wall whole.', copy: 'The routes are tested, sealed, skimmed and painted until the work disappears.', asset: '06-patch-paint.webp', focal: 50},
  {label: 'Fit', title: 'Controls land perfectly.', copy: 'UK/Cyprus sockets and switches sit level, secure and ready for everyday use.', asset: '07-fittings.webp', focal: 50},
  {label: 'Light', title: 'Bring the space alive.', copy: 'One final test. Then the architecture answers with warm, controlled light.', asset: '08-lights-on.webp', focal: 50},
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
        <h1 id="installation-story-title">Power,<br/><em>built into</em><br/>the architecture.</h1>
        <p>{description}</p>
      </div>
      <div className="installation-story__scroll-cue"><ArrowDown/><span>Scroll to build</span><i/></div>
    </section>

    <section className="installation-story__manifesto" aria-label="Installation principle">
      <span>THE WORK BEHIND THE WALL</span>
      <h2>The best electrical work <em>disappears.</em><br/>The result never does.</h2>
      <p>One controlled sequence - from the first mark to the moment the room comes alive.</p>
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
        <span><CheckCircle2/> TESTED / FINISHED / READY</span>
        <h2 id="installation-outcome-title">From raw structure.<br/><em>To living light.</em></h2>
        <p>Plan the routes, protect the system and finish every visible detail with one accountable electrical team.</p>
        <Link to="/request-a-quote?service=electrical-installations"><span>{actionLabel}</span><ArrowRight/></Link>
      </div>
    </section>
  </div>;
}
