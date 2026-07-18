import {defineExperienceModule} from '../../core/defineExperienceModule';
import type {MotionPreference} from '../../core/types';
import {ElectricalExperienceV3} from './v3/ElectricalExperienceV3';
import './v3/styles.css';

function ExperienceView({motion}: {motion: MotionPreference}) {
  return <ElectricalExperienceV3 motion={motion}/>;
}

export default defineExperienceModule({
  id: 'electrical-installations-journey',
  version: '3.0.0',
  View: ExperienceView,
});
