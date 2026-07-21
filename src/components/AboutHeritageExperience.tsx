import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import {AnimatePresence, motion} from 'framer-motion';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CircuitBoard,
  ExternalLink,
  Mail,
  Users,
  Zap,
} from 'lucide-react';
import type {TeamMember} from '../types';
import {useMotionPreference} from '../interactive/react/useMotionPreference';
import {AboutHeritageFilm} from '../remotion/AboutHeritageFilm';
import {publicAsset} from '../utils/assets';

type AboutHeritageExperienceProps = {
  title: string;
  heroBody: string;
  introduction: string;
  summary: string;
  history: string[];
  companySlug: string;
  members: TeamMember[];
};

type PracticeGroup = {
  id: string;
  label: string;
  description: string;
  matches: (member: TeamMember) => boolean;
};

const defaultHistory = [
  '1985 — Ntinos and Eliana establish NK Electrical.',
  'Today — Specialists plan, supply, install, test and support each system.',
  'Next — More connected, energy-aware electrical spaces for Cyprus.',
];

const eraFrames = [0, 120, 240];

const practiceGroups: PracticeGroup[] = [
  {
    id: 'all',
    label: 'Complete circuit',
    description: 'Every discipline that carries a project from first conversation to final test.',
    matches: () => true,
  },
  {
    id: 'leadership',
    label: 'Direction',
    description: 'Company responsibility, technical judgement and operational continuity.',
    matches: member => member.branch === 'Leadership',
  },
  {
    id: 'engineering',
    label: 'Plan + design',
    description: 'Power engineering, automation, lighting design and system coordination.',
    matches: member => ['Engineering', 'Design & retail'].includes(member.branch),
  },
  {
    id: 'site',
    label: 'Install + verify',
    description: 'The people who build, connect, secure, inspect and leave the system working.',
    matches: member => ['Electrical installations', 'Cameras & security'].includes(member.branch),
  },
  {
    id: 'client',
    label: 'Client support',
    description: 'The human connection between an enquiry, the showroom and the right specialist.',
    matches: member => member.branch === 'Reception & sales',
  },
];

const splitHistoryEntry = (entry: string, fallbackLabel: string) => {
  const parts = entry.split(/\s+[—–-]\s+/);
  if (parts.length < 2) return {label: fallbackLabel, detail: entry};
  return {label: parts[0], detail: parts.slice(1).join(' — ')};
};

const eraMeta = [
  {
    eyebrow: 'The original circuit',
    headline: 'A family name became a working standard.',
    prompt: 'Move through the story',
  },
  {
    eyebrow: 'The system today',
    headline: 'Different specialists. One accountable handover.',
    prompt: 'Meet the people behind the work',
  },
  {
    eyebrow: 'The next current',
    headline: 'Experience travels forward. Standards stay connected.',
    prompt: 'See what continues',
  },
];

const frameToEra = (frame: number) => {
  if (frame >= 300 || frame < 60) return 0;
  if (frame < 180) return 1;
  return 2;
};

function AboutTeamExplorer({members}: {members: TeamMember[]}) {
  const [groupId, setGroupId] = useState('all');
  const activeGroup = practiceGroups.find(group => group.id === groupId) || practiceGroups[0];
  const filteredMembers = useMemo(
    () => members.filter(activeGroup.matches),
    [activeGroup, members],
  );
  const [activeMemberName, setActiveMemberName] = useState(members[0]?.name || '');

  useEffect(() => {
    if (!filteredMembers.some(member => member.name === activeMemberName)) {
      setActiveMemberName(filteredMembers[0]?.name || '');
    }
  }, [activeMemberName, filteredMembers]);

  const activeMember = filteredMembers.find(member => member.name === activeMemberName) || filteredMembers[0];
  const activeIndex = Math.max(0, filteredMembers.findIndex(member => member.name === activeMember?.name));

  const moveMember = (direction: -1 | 1) => {
    if (!filteredMembers.length) return;
    const nextIndex = (activeIndex + direction + filteredMembers.length) % filteredMembers.length;
    setActiveMemberName(filteredMembers[nextIndex].name);
  };

  const handleMemberKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    moveMember(event.key === 'ArrowLeft' ? -1 : 1);
  };

  if (!activeMember) return null;

  return <section className="about-team" id="about-team" aria-labelledby="about-team-title">
    <header className="about-team__heading">
      <div>
        <span>THE PEOPLE / LIVE RESPONSIBILITY MAP</span>
        <h2 id="about-team-title">Not a list of names.<br/><em>A working circuit.</em></h2>
      </div>
      <p>Choose a part of the work. The interface shows exactly who carries it and what they are accountable for.</p>
    </header>

    <div className="about-team__filters" role="tablist" aria-label="Filter team by responsibility">
      {practiceGroups.map((group, index) => <button
        type="button"
        role="tab"
        aria-selected={group.id === groupId}
        className={group.id === groupId ? 'active' : ''}
        onClick={() => setGroupId(group.id)}
        key={group.id}
      >
        <span>{String(index + 1).padStart(2, '0')}</span>
        <strong>{group.label}</strong>
      </button>)}
    </div>

    <div className="about-team__stage" onKeyDown={handleMemberKeys}>
      <AnimatePresence mode="wait">
        <motion.figure
          className="about-team__portrait"
          key={`${groupId}-${activeMember.name}`}
          initial={{opacity: 0, x: -18}}
          animate={{opacity: 1, x: 0}}
          exit={{opacity: 0, x: 18}}
          transition={{duration: .32, ease: [.16, 1, .3, 1]}}
        >
          <img src={activeMember.image} alt={`Illustrated role portrait for ${activeMember.name}, ${activeMember.role}`}/>
          <figcaption>
            <span>{activeMember.branch}</span>
            <b>{String(activeIndex + 1).padStart(2, '0')} / {String(filteredMembers.length).padStart(2, '0')}</b>
          </figcaption>
        </motion.figure>
      </AnimatePresence>

      <div className="about-team__detail" role="tabpanel">
        <div className="about-team__signal"><i/><span>ACTIVE RESPONSIBILITY</span><b>{activeMember.responsibility}</b></div>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeMember.name}
            initial={{opacity: 0, y: 14}}
            animate={{opacity: 1, y: 0}}
            exit={{opacity: 0, y: -10}}
            transition={{duration: .28, ease: [.16, 1, .3, 1]}}
          >
            <p className="about-team__group-copy">{activeGroup.description}</p>
            <h3>{activeMember.name}</h3>
            <p className="about-team__role">{activeMember.role}</p>
            <p className="about-team__area">{activeMember.workArea}</p>
            {activeMember.credential && <p className="about-team__credential">{activeMember.credential}</p>}
            <ul aria-label={`${activeMember.name} areas of contribution`}>
              {activeMember.characteristics.map((characteristic, index) => <li key={characteristic}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <b>{characteristic}</b>
              </li>)}
            </ul>
          </motion.div>
        </AnimatePresence>

        <div className="about-team__actions">
          <div>
            <button type="button" onClick={() => moveMember(-1)} aria-label="Previous team member"><ArrowLeft/></button>
            <button type="button" onClick={() => moveMember(1)} aria-label="Next team member"><ArrowRight/></button>
          </div>
          <nav aria-label={`${activeMember.name} contact links`}>
            {activeMember.email && <a href={`mailto:${activeMember.email}`}><Mail/><span>Email</span></a>}
            {activeMember.linkedin && <a href={activeMember.linkedin} target="_blank" rel="noreferrer"><ExternalLink/><span>LinkedIn</span></a>}
          </nav>
        </div>
      </div>
    </div>

    <div className="about-team__member-rail" aria-label={`${activeGroup.label} team members`}>
      {filteredMembers.map((member, index) => <button
        type="button"
        className={member.name === activeMember.name ? 'active' : ''}
        aria-pressed={member.name === activeMember.name}
        onClick={() => setActiveMemberName(member.name)}
        key={member.name}
      >
        <img src={member.image} alt=""/>
        <span>{String(index + 1).padStart(2, '0')}</span>
        <strong>{member.name}</strong>
        <small>{member.responsibility}</small>
      </button>)}
    </div>
  </section>;
}

export function AboutHeritageExperience({
  title,
  heroBody,
  introduction,
  summary,
  history,
  companySlug,
  members,
}: AboutHeritageExperienceProps) {
  const motionPreference = useMotionPreference();
  const playerRef = useRef<PlayerRef>(null);
  const heroRef = useRef<HTMLElement>(null);
  const activeEraRef = useRef(0);
  const [activeEra, setActiveEra] = useState(0);
  const visibleHistory = (history.length ? history : defaultHistory).slice(0, 3);
  const entries = defaultHistory.map((fallback, index) => visibleHistory[index] || fallback);
  const parsedHistory = entries.map((entry, index) => splitHistoryEntry(entry, ['1985', 'Today', 'Next'][index]));
  const headlineParts = title.split(/\.\s+/).filter(Boolean);
  const heroFirstLine = (headlineParts[0] || 'Electrical expertise').replace(/[.!?]+$/, '');
  const heroSecondLine = (headlineParts.slice(1).join('. ') || 'Family accountability').replace(/[.!?]+$/, '');
  const filmImages: [string, string, string] = [
    publicAsset('assets/generated/nk-heritage-1985.webp'),
    publicAsset('assets/generated/team-craft.webp'),
    publicAsset('assets/heroes/about.webp'),
  ];

  const chooseEra = useCallback((index: number) => {
    playerRef.current?.pause();
    playerRef.current?.seekTo(eraFrames[index]);
    activeEraRef.current = index;
    setActiveEra(index);
  }, []);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const handleFrame = (event: {detail: {frame: number}}) => {
      const nextEra = frameToEra(event.detail.frame);
      if (nextEra === activeEraRef.current) return;
      activeEraRef.current = nextEra;
      setActiveEra(nextEra);
    };
    player.addEventListener('frameupdate', handleFrame);
    if (motionPreference === 'reduced') player.pause();
    return () => player.removeEventListener('frameupdate', handleFrame);
  }, [motionPreference]);

  const handleHeroKeys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    chooseEra((activeEra + direction + 3) % 3);
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (motionPreference === 'reduced') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - .5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - .5) * 2;
    event.currentTarget.style.setProperty('--history-x', x.toFixed(3));
    event.currentTarget.style.setProperty('--history-y', y.toFixed(3));
  };

  const resetPointer = () => {
    heroRef.current?.style.setProperty('--history-x', '0');
    heroRef.current?.style.setProperty('--history-y', '0');
  };

  return <>
    <section
      className={`about-history about-history--era-${activeEra}`}
      ref={heroRef}
      tabIndex={0}
      aria-labelledby="about-history-title"
      onKeyDown={handleHeroKeys}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetPointer}
      style={{'--history-x': 0, '--history-y': 0} as CSSProperties}
    >
      <div className="about-history__film" aria-hidden="true">
        <Player
          ref={playerRef}
          component={AboutHeritageFilm}
          inputProps={{images: filmImages}}
          durationInFrames={360}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={30}
          loop
          autoPlay={motionPreference === 'full'}
          initiallyMuted
          controls={false}
          clickToPlay={false}
          acknowledgeRemotionLicense
          style={{width: '100%', height: '100%'}}
        />
      </div>
      <div className="about-history__grain" aria-hidden="true"/>

      <header className="about-history__header">
        <span><Zap/> NK / FAMILY CURRENT / EST. 1985</span>
        <span>NICOSIA · CYPRUS</span>
      </header>

      <div className="about-history__title">
        <span>FOUR DECADES, STILL LIVE</span>
        <h1 id="about-history-title"><span>{heroFirstLine}.</span><em>{heroSecondLine}.</em></h1>
        <p>{heroBody}</p>
        <a href="#about-story"><span>Enter the company story</span><ArrowDown/></a>
      </div>

      <AnimatePresence mode="wait">
        <motion.aside
          className="about-history__era-card"
          key={activeEra}
          initial={{opacity: 0, y: 18}}
          animate={{opacity: 1, y: 0}}
          exit={{opacity: 0, y: -12}}
          transition={{duration: .34, ease: [.16, 1, .3, 1]}}
          aria-live="polite"
        >
          <small>{eraMeta[activeEra].eyebrow}</small>
          <b>{parsedHistory[activeEra].label}</b>
          <h2>{eraMeta[activeEra].headline}</h2>
          <p
            data-visual-kind="company"
            data-visual-slug={companySlug}
            data-visual-path={`history@line.${activeEra}`}
            data-visual-edit="text"
            data-visual-label={`History entry ${activeEra + 1}`}
            data-visual-multiline="true"
          >{parsedHistory[activeEra].detail}</p>
          <span>{eraMeta[activeEra].prompt} <ArrowRight/></span>
        </motion.aside>
      </AnimatePresence>

      <div className="about-history__era-nav" role="tablist" aria-label="Company history eras">
        {parsedHistory.map((entry, index) => <button
          type="button"
          role="tab"
          aria-selected={index === activeEra}
          className={index === activeEra ? 'active' : ''}
          onClick={() => chooseEra(index)}
          key={`${entry.label}-${index}`}
        >
          <span>{String(index + 1).padStart(2, '0')}</span>
          <strong>{entry.label}</strong>
          <i><b/></i>
        </button>)}
      </div>
    </section>

    <section className="about-story" id="about-story" aria-labelledby="about-story-title">
      <div className="about-story__index">
        <CircuitBoard/>
        <span>HISTORY IS NOT A DECORATION.<br/>IT IS HOW THE WORK IS CARRIED.</span>
      </div>
      <div className="about-story__copy">
        <span>1985 → TODAY</span>
        <h2 id="about-story-title">What began as trust between a family and its clients now runs through every drawing, installation and handover.</h2>
        <div>
          <p
            data-visual-kind="company"
            data-visual-slug={companySlug}
            data-visual-path="introduction"
            data-visual-edit="text"
            data-visual-label="Company introduction"
            data-visual-multiline="true"
          >{introduction}</p>
          <p
            data-visual-kind="company"
            data-visual-slug={companySlug}
            data-visual-path="heading"
            data-visual-edit="text"
            data-visual-label="Company summary"
            data-visual-multiline="true"
          >{summary}</p>
        </div>
      </div>
      <div className="about-story__facts" aria-label="NK Electrical continuity">
        <article><span>01</span><Users/><strong>Family accountability</strong><p>A real person remains responsible for the work and the client relationship.</p></article>
        <article><span>02</span><CircuitBoard/><strong>Connected expertise</strong><p>Engineering, lighting, installation, sales and support coordinate as one system.</p></article>
        <article><span>03</span><Zap/><strong>Built to remain live</strong><p>The standard is not the switch-on moment. It is how the system performs afterwards.</p></article>
      </div>
    </section>

    <AboutTeamExplorer members={members}/>
  </>;
}
