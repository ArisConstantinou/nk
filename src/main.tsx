import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import 'leaflet/dist/leaflet.css';
import App from './App';
import {applyHomePalette, getHomePalette} from './homePalettes';
import {applyTheme, getThemePreference} from './theme';
import './styles.css';
import './typography.css';
import './navigation-redesign.css';
import './shop-catalogue.css';
import './product-sharing.css';
import './interactive/styles.css';
import './page-visuals.css';
import './service-signatures.css';
import './about-experience.css';
import './contact-experience.css';
import './quote-experience.css';
import './action-system.css';
import './route-interactions.css';
import './navigation-panels.css';
import './unified-theme.css';
import './header-responsive.css';

document.documentElement.dataset.experience = 'tech';
applyTheme(getThemePreference());
applyHomePalette(getHomePalette());
try { window.localStorage.setItem('nk-experience-theme', 'tech'); } catch { /* Storage may be blocked; rendering must still continue. */ }

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
