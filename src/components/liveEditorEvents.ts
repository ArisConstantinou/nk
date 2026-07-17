export const LIVE_EDITOR_COMMAND_EVENT = 'nk-live-editor:command';
export const LIVE_EDITOR_MESSAGE_EVENT = 'nk-live-editor:message';
export const LIVE_EDITOR_NONCE = 'live-site';

export function sendLiveEditorCommand(detail: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent(LIVE_EDITOR_COMMAND_EVENT, {detail: {...detail, nonce: LIVE_EDITOR_NONCE}}));
}
