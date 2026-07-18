import type {MotionPreference} from '../../core/types';
import {ExperiencePresentation} from '../../engine/ExperiencePresentation';
import {usePublishedExperience} from '../../engine/usePublishedExperience';
import {electricalInstallationTemplate} from '../../templates/electricalInstallation';

export function ElectricalTemplateExperience({motion}: {motion: MotionPreference}) {
  const {document} = usePublishedExperience('electrical-installations', electricalInstallationTemplate);
  return <ExperiencePresentation document={document} motion={motion}/>;
}
