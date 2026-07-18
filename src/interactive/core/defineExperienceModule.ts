import type {ExperienceModule, ExperienceProps} from './types';

export function defineExperienceModule<TProps extends ExperienceProps>(module: ExperienceModule<TProps>) {
  return Object.freeze(module);
}
