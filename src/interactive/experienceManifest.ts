import type {ExperienceManifestEntry} from './core/types';
import {experienceSlots} from './slots';

const enabled = (key: string) => import.meta.env[`VITE_EXPERIENCE_${key}`] !== 'false';

export const experienceManifest = [
  {
    id: 'electrical-installations-journey',
    slot: experienceSlots.service('electrical-installations'),
    version: '4.0.0',
    enabled: enabled('ELECTRICAL_INSTALLATIONS'),
    routes: ['/services/electrical-installations'],
    reducedMotion: 'adapt',
    load: () => import('./modules/electrical-installations'),
  },
] satisfies readonly ExperienceManifestEntry[];
