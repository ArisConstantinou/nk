import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles.css';

const storedColourTheme = window.localStorage.getItem('nk-color-theme');
const storedExperienceTheme = window.localStorage.getItem('nk-experience-theme');
const initialDarkTheme = storedColourTheme
  ? storedColourTheme === 'dark'
  : window.matchMedia('(prefers-color-scheme: dark)').matches;

document.documentElement.dataset.theme = initialDarkTheme ? 'dark' : 'light';
document.documentElement.dataset.experience = storedExperienceTheme || 'tech';
document.documentElement.style.colorScheme = initialDarkTheme ? 'dark' : 'light';

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
