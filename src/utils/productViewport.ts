/** The desktop header and mobile command bar use different positioning. */
export function productViewportTop() {
  let bottom = 0;
  for (const selector of ['.ia-header', '.ia-header-bar']) {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element || !['fixed', 'sticky'].includes(getComputedStyle(element).position)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.height && rect.bottom > 0) bottom = Math.max(bottom, rect.bottom);
  }
  return bottom;
}
