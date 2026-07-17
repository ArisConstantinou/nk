import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import App from './App';
import {applyHomePalette, getHomePalette} from './homePalettes';
import {applyTheme, getThemePreference} from './theme';
import './styles.css';
import './typography.css';
import './navigation-redesign.css';
import './shop-catalogue.css';
import './product-sharing.css';

document.documentElement.dataset.experience = 'tech';
applyTheme(getThemePreference());
applyHomePalette(getHomePalette());
try { window.localStorage.setItem('nk-experience-theme', 'tech'); } catch { /* Storage may be blocked; rendering must still continue. */ }

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
