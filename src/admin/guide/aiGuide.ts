import type {PageComponentType, PageSection} from '../types';

export type CmsGuideLanguage = 'en' | 'el';
export type CmsGuideActionName = 'insert_section' | 'insert_component' | 'complete';
export type CmsGuideComponent = {type: PageComponentType; label: string; text: string; url: string; image: string; alt: string; icon: string; images: string[]};
export type CmsGuideAction = {
  action: CmsGuideActionName; afterSectionId: string; targetSectionId: string; afterComponentId: string;
  section: Pick<PageSection, 'type' | 'eyebrow' | 'title' | 'body' | 'buttonLabel' | 'buttonUrl' | 'image' | 'icon' | 'layout' | 'columns'>;
  component: CmsGuideComponent;
  explanation: {summary: string; reason: string; howToChange: string}; designNotes: string[];
};
export type CmsGuideContext = {
  page: {id: string; slug: string; title: string; route: string; sections: Array<{id: string; type: string; title: string; body: string; layout: string; columns: number; enabled: boolean; components: Array<{id: string; type: string; label: string; text: string; image: string; images: string[]; width: number; tone: string; enabled: boolean}>}>};
  coreContent: Record<string, string | number | boolean>;
  renderedOutline: Array<{index: number; id: string; role: string; className: string; headings: string[]; textSample: string; imageCount: number; links: string[]; builderSectionId: string}>;
  availableMedia: Array<{id: string; url: string; alt: string}>; recentChanges: string[];
  constraints: {additiveOnly: true; noAutomaticPublish: true; maxSections: number; maxComponentsPerSection: number; maxColumns: number; sharedAcrossViewports: true; allowedActions: CmsGuideActionName[]};
};
export type CmsGuideStepResult = {proposal: CmsGuideAction; context: CmsGuideContext; applied: boolean; objectLabel: string};
export type CmsGuideStepEventDetail = {language: CmsGuideLanguage; handled: () => void; resolve: (result: CmsGuideStepResult) => void; reject: (error: unknown) => void};

export const CMS_GUIDE_STEP_EVENT = 'nk-admin-guide:run-cms-step';

export function requestCmsGuideStep(language: CmsGuideLanguage): Promise<CmsGuideStepResult> {
  return new Promise((resolve, reject) => {
    let handled = false;
    const timeout = window.setTimeout(() => reject(new Error(handled ? 'The AI guide timed out. No content was changed.' : 'Open the Website Editor before running the AI guide.')), 35_000);
    const finish = (callback: () => void) => {window.clearTimeout(timeout); callback();};
    const detail: CmsGuideStepEventDetail = {
      language,
      handled: () => {handled = true;},
      resolve: result => finish(() => resolve(result)),
      reject: error => finish(() => reject(error)),
    };
    window.dispatchEvent(new CustomEvent<CmsGuideStepEventDetail>(CMS_GUIDE_STEP_EVENT, {detail}));
  });
}
