import {useEffect, type RefObject} from 'react';
import {productViewportTop} from '../utils/productViewport';

/** Wheel gestures advance through actual grid rows, including readable stops in tall details. */
export function useProductRowScroll(gridRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    let frame = 0;
    let direction = 0;
    let accumulated = 0;
    let lastWheel = 0;
    let animating = false;
    let advanced = false;
    let touchOrigin: number | null = null;
    let touching = false;
    let settleTimer = 0;

    const cancel = () => {
      cancelAnimationFrame(frame);
      animating = false;
      accumulated = 0;
    };
    const stops = () => {
      const top = productViewportTop() + 16;
      const dock = document.querySelector<HTMLElement>('.electrical-mobile-dock');
      const bottom = dock && getComputedStyle(dock).display !== 'none' ? dock.getBoundingClientRect().height : 0;
      const available = Math.max(120, innerHeight - top - bottom - 16);
      const rows = new Map<number, number>();
      for (const child of grid.children) {
        const rect = child.getBoundingClientRect();
        const y = Math.round(rect.top + scrollY - top);
        rows.set(y, Math.max(rows.get(y) || 0, rect.height));
      }
      const max = document.documentElement.scrollHeight - innerHeight;
      const result: number[] = [];
      for (const [y, height] of rows) {
        result.push(Math.max(0, Math.min(max, y)));
        // Never skip the lower half of a tall row or expanded product.
        const overflow = height - available;
        for (let offset = available * .85; offset < overflow; offset += available * .85) {
          result.push(Math.max(0, Math.min(max, Math.round(y + offset))));
        }
        if (overflow > 8) result.push(Math.max(0, Math.min(max, Math.round(y + overflow))));
      }
      return [...new Set(result)].sort((a, b) => a - b);
    };
    const animateTo = (destination: number) => {
      const current = scrollY;
      cancel();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.scrollTo({top: destination, behavior: 'instant'});
        return true;
      }
      animating = true;
      const start = performance.now();
      const animate = (now: number) => {
        const progress = Math.min(1, (now - start) / 480);
        const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
        window.scrollTo({top: current + (destination - current) * eased, behavior: 'instant'});
        if (progress < 1) frame = requestAnimationFrame(animate);
        else animating = false;
      };
      frame = requestAnimationFrame(animate);
      return true;
    };
    const move = (nextDirection: number) => {
      const positions = stops();
      const destination = nextDirection > 0
        ? positions.find(y => y > scrollY + 8)
        : [...positions].reverse().find(y => y < scrollY - 8);
      if (destination === undefined) return false;
      direction = nextDirection;
      return animateTo(destination);
    };
    const scheduleTouchSettle = () => {
      clearTimeout(settleTimer);
      if (touching || touchOrigin === null) return;
      settleTimer = window.setTimeout(() => {
        const origin = touchOrigin;
        touchOrigin = null;
        if (origin === null || Math.abs(scrollY - origin) < 24) return;
        const positions = stops();
        if (!positions.length || scrollY < positions[0] - 16 || scrollY > positions[positions.length - 1] + 16) return;
        let destination = positions.reduce((best, y) => Math.abs(y - scrollY) < Math.abs(best - scrollY) ? y : best);
        if (Math.abs(destination - origin) < 16) {
          destination = (scrollY > origin ? positions.find(y => y > origin + 16) : [...positions].reverse().find(y => y < origin - 16)) ?? destination;
        }
        animateTo(destination);
      }, 160);
    };
    const touchStart = (event: TouchEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (event.touches.length !== 1 || target?.closest('input, textarea, select, [role="dialog"], .product-share__panel')) return;
      cancel();
      clearTimeout(settleTimer);
      touchOrigin = scrollY;
      touching = true;
    };
    const touchEnd = () => { touching = false; scheduleTouchSettle(); };
    const touchCancel = () => { touching = false; touchOrigin = null; clearTimeout(settleTimer); };
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY) return;
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !grid.contains(target) || target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], .product-share__panel')) return;
      for (let node: Element | null = target; node && node !== grid; node = node.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + 1) return;
      }
      const now = performance.now();
      const nextDirection = Math.sign(event.deltaY);
      const sameGesture = nextDirection === direction && now - lastWheel < 180;
      lastWheel = now;
      if (nextDirection === direction && (animating || (advanced && sameGesture))) {
        event.preventDefault();
        return;
      }
      advanced = false;
      if (nextDirection !== direction) { cancel(); direction = nextDirection; }
      accumulated += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
      if (Math.abs(accumulated) < 24) return;
      accumulated = 0;
      if (move(nextDirection)) { advanced = true; event.preventDefault(); }
    };
    window.addEventListener('wheel', wheel, {passive: false});
    grid.addEventListener('touchstart', touchStart, {passive: true});
    window.addEventListener('touchend', touchEnd, {passive: true});
    window.addEventListener('touchcancel', touchCancel, {passive: true});
    window.addEventListener('scroll', scheduleTouchSettle, {passive: true});
    window.addEventListener('pointerdown', cancel);
    window.addEventListener('keydown', cancel);
    window.addEventListener('resize', cancel);
    return () => {
      cancel();
      touchCancel();
      grid.removeEventListener('touchstart', touchStart);
      window.removeEventListener('touchend', touchEnd);
      window.removeEventListener('touchcancel', touchCancel);
      window.removeEventListener('scroll', scheduleTouchSettle);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('pointerdown', cancel);
      window.removeEventListener('keydown', cancel);
      window.removeEventListener('resize', cancel);
    };
  }, [gridRef]);
}
