import type {PageComponentType, PageSection} from '../types';

export type CmsGuideLanguage = 'en' | 'el';
export type CmsGuideActionName = 'insert_section' | 'insert_component' | 'complete';
export type CmsGuideFinishMode = 'keep' | 'discard';
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
export type CmsGuideSession = {recordId: string; slug: string; title: string; route: string; startedAt: string};
export type CmsGuideStartResult = {session: CmsGuideSession};
export type CmsGuideStepResult = {proposal: CmsGuideAction; context: CmsGuideContext; applied: boolean; objectLabel: string};
export type CmsGuideFinishResult = {mode: CmsGuideFinishMode; recordId: string};

type GuideEventHandlers<T> = {handled: () => void; resolve: (result: T) => void; reject: (error: unknown) => void};
export type CmsGuideStartEventDetail = GuideEventHandlers<CmsGuideStartResult> & {language: CmsGuideLanguage};
export type CmsGuideStepEventDetail = GuideEventHandlers<CmsGuideStepResult> & {language: CmsGuideLanguage};
export type CmsGuideApplyEventDetail = GuideEventHandlers<CmsGuideStepResult> & {proposal: CmsGuideAction; context: CmsGuideContext};
export type CmsGuideFinishEventDetail = GuideEventHandlers<CmsGuideFinishResult> & {mode: CmsGuideFinishMode};

export const CMS_GUIDE_START_EVENT = 'nk-admin-guide:start-demo';
export const CMS_GUIDE_STEP_EVENT = 'nk-admin-guide:analyse-step';
export const CMS_GUIDE_APPLY_EVENT = 'nk-admin-guide:apply-step';
export const CMS_GUIDE_FINISH_EVENT = 'nk-admin-guide:finish-demo';

function requestGuideEvent<T>(name: string, payload: Record<string, unknown>, timeoutMs: number, missingMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    let handled = false;
    const timeout = window.setTimeout(() => reject(new Error(handled ? 'The interactive guide timed out. No additional content was changed.' : missingMessage)), timeoutMs);
    const finish = (callback: () => void) => {window.clearTimeout(timeout); callback();};
    window.dispatchEvent(new CustomEvent(name, {detail: {
      ...payload,
      handled: () => {handled = true;},
      resolve: (result: T) => finish(() => resolve(result)),
      reject: (error: unknown) => finish(() => reject(error)),
    }}));
  });
}

export const requestCmsGuideStart = (language: CmsGuideLanguage) => requestGuideEvent<CmsGuideStartResult>(CMS_GUIDE_START_EVENT, {language}, 20_000, 'Open the Website Editor before starting the interactive guide.');
export const requestCmsGuideStep = (language: CmsGuideLanguage) => requestGuideEvent<CmsGuideStepResult>(CMS_GUIDE_STEP_EVENT, {language}, 35_000, 'Open the interactive demo in the Website Editor before asking for the next step.');
export const applyCmsGuideStep = (proposal: CmsGuideAction, context: CmsGuideContext) => requestGuideEvent<CmsGuideStepResult>(CMS_GUIDE_APPLY_EVENT, {proposal, context}, 20_000, 'Open the interactive demo in the Website Editor before applying this step.');
export const finishCmsGuide = (mode: CmsGuideFinishMode) => requestGuideEvent<CmsGuideFinishResult>(CMS_GUIDE_FINISH_EVENT, {mode}, 20_000, 'Open the interactive demo in the Website Editor before finishing the guide.');
