import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/manrope/latin-400.css';
import '@fontsource/manrope/latin-500.css';
import '@fontsource/manrope/latin-600.css';
import App from './App';
import './styles.css';
import './typography.css';
import './navigation-redesign.css';
import './shop-catalogue.css';
import './product-sharing.css';

document.documentElement.dataset.theme = 'dark';
document.documentElement.dataset.experience = 'tech';
document.documentElement.style.colorScheme = 'dark';
try { window.localStorage.setItem('nk-experience-theme', 'tech'); } catch { /* Storage may be blocked; rendering must still continue. */ }

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
