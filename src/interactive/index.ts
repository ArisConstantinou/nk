export {loadGsap, createGsapScope} from './adapters/gsap';
export {observeElementResize, observeInView, observeScrollProgress} from './adapters/scroll';
export {AccessibleSvg} from './components/AccessibleSvg';
export {defineExperienceModule} from './core/defineExperienceModule';
export {observeDocumentVisibility, watchMedia} from './core/media';
export type {
  ExperienceManifestEntry,
  ExperienceModule,
  ExperienceModuleContext,
  ExperienceProps,
  ExperienceRoute,
  ExperienceViewProps,
  MotionPreference,
} from './core/types';
export {ExperienceProvider} from './react/ExperienceProvider';
export {ExperienceSlot} from './react/ExperienceSlot';
export {experienceSlots} from './slots';
