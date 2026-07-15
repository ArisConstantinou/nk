import {CircuitBoard, Layers3, Moon, Route, Sun} from 'lucide-react';
import {useTheme, type ExperienceTheme} from '../context/ThemeContext';

const themes: Array<{id: ExperienceTheme; label: string; Icon: typeof Route}> = [
  {id: 'flow', label: 'Flow theme', Icon: Route},
  {id: 'tech', label: 'Systems theme', Icon: CircuitBoard},
  {id: 'studio', label: 'Studio theme', Icon: Layers3},
];

export function ThemeControls({className = ''}: {className?: string}) {
  const {darkTheme, experienceTheme, setExperienceTheme, toggleDarkTheme} = useTheme();

  return <div className={`theme-controls ${className}`.trim()} role="group" aria-label="Website appearance">
    <button
      className="theme-control theme-control--colour"
      type="button"
      aria-label={darkTheme ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={darkTheme}
      data-tooltip={darkTheme ? 'Light mode' : 'Dark mode'}
      onClick={toggleDarkTheme}
    >
      {darkTheme ? <Sun aria-hidden="true"/> : <Moon aria-hidden="true"/>}
      <span className="theme-control-label">{darkTheme ? 'Light mode' : 'Dark mode'}</span>
    </button>
    {themes.map(({id, label, Icon}) => <button
      className={`theme-control theme-control--${id}`}
      type="button"
      aria-label={`Switch to ${label.toLowerCase()}`}
      aria-pressed={experienceTheme === id}
      data-tooltip={label}
      onClick={() => setExperienceTheme(id)}
      key={id}
    >
      <Icon aria-hidden="true"/>
      <span className="theme-control-label">{label}</span>
    </button>)}
  </div>;
}
