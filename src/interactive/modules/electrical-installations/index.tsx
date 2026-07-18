import {defineExperienceModule} from '../../core/defineExperienceModule';
import type {MotionPreference} from '../../core/types';
import {ElectricalTemplateExperience} from './ElectricalTemplateExperience';

function ExperienceView({motion}: {motion: MotionPreference}) {
  return <ElectricalTemplateExperience motion={motion}/>;
}

export default defineExperienceModule({
  id: 'electrical-installations-journey',
  version: '4.0.0',
  View: ExperienceView,
});
