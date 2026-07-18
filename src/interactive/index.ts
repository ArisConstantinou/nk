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
export {ExperiencePresentation} from './engine/ExperiencePresentation';
export {ExperienceStage} from './engine/ExperienceStage';
export {usePublishedExperience} from './engine/usePublishedExperience';
export {
  createDocument,
  createSection,
  createStableId,
  DEFAULT_STAGE_HEIGHT,
  DEFAULT_STAGE_WIDTH,
  EXPERIENCE_SCHEMA_VERSION,
} from './engine/schema';
export type {
  ExperienceAsset,
  ExperienceAssetGroup,
  ExperienceDocument,
  ExperienceLayer,
  ExperienceSection,
  ExperienceTool,
  ExperienceViewMode,
  InteractiveExperienceRecord,
  LayerTransform,
} from './engine/schema';
export {experienceSlots} from './slots';
