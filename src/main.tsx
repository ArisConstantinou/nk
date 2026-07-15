import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles.css';
import './typography.css';
import './navigation-redesign.css';

document.documentElement.dataset.theme = 'dark';
document.documentElement.dataset.experience = 'tech';
document.documentElement.style.colorScheme = 'dark';
window.localStorage.setItem('nk-experience-theme', 'tech');

createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
