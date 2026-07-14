import {CircuitBoard, Moon, Sun} from 'lucide-react';
import {useTheme} from '../context/ThemeContext';

export function ThemeControls({className = ''}: {className?: string}) {
  const {darkTheme, electricalTheme, toggleDarkTheme, toggleElectricalTheme} = useTheme();

  return <div className={`theme-controls ${className}`.trim()} role="group" aria-label="Website appearance">
    <button
      className="theme-control"
      type="button"
      aria-label={darkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
      aria-pressed={darkTheme}
      data-tooltip={darkTheme ? 'Light mode' : 'Dark mode'}
      onClick={toggleDarkTheme}
    >
      {darkTheme ? <Sun aria-hidden="true"/> : <Moon aria-hidden="true"/>}
      <span className="theme-control-label">{darkTheme ? 'Light mode' : 'Dark mode'}</span>
    </button>
    <button
      className="theme-control theme-control--electrical"
      type="button"
      aria-label={electricalTheme ? 'Switch to studio theme' : 'Switch to electrical systems experience'}
      aria-pressed={electricalTheme}
      data-tooltip={electricalTheme ? 'Studio theme' : 'Electrical systems'}
      onClick={toggleElectricalTheme}
    >
      <CircuitBoard aria-hidden="true"/>
      <span className="theme-control-label">{electricalTheme ? 'Studio theme' : 'Electrical systems'}</span>
    </button>
  </div>;
}
