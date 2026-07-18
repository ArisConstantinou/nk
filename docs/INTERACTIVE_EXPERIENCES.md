# Interactive Experience Framework

This framework is the integration boundary for SVG, GSAP and scroll-driven experiences. The electrical-installations experience is the first production module; every other service can still ship, disable or replace its own module independently.

## Architecture

```text
src/interactive/
  adapters/                 Optional engines and browser observers
    gsap.ts                 Lazy GSAP + ScrollTrigger loader and scoped cleanup
    scroll.ts               Native in-view, resize and scroll-progress primitives
  components/
    AccessibleSvg.tsx       Accessible, responsive SVG root
  core/
    ExperienceRegistry.ts   Slot resolution, route matching and replacement priority
    defineExperienceModule.ts
    frameScheduler.ts       Batched DOM reads/writes with requestAnimationFrame
    media.ts                Viewport, pointer, media-query and visibility utilities
    types.ts                Stable public module contract
  modules/                  One independently loaded folder per experience
  react/
    ExperienceProvider.tsx  Route-aware registry boundary
    ExperienceSlot.tsx      Lazy loader, lifecycle, error isolation and cleanup
  experienceManifest.ts     Activation, version, route and module loader declarations
  slots.ts                  Canonical slot names
  styles.css                Scoped infrastructure and reduced-motion utilities
```

The public application owns one `ExperienceProvider`. A page only declares an `ExperienceSlot`; it does not import a specific experience. This prevents page components from becoming coupled to GSAP, SVG scene structure or a particular version of an effect.

## Lifecycle contract

Every enabled module moves through the following lifecycle:

```text
route + slot -> registry resolution -> lazy import -> render -> mount -> cleanup
                                      failure stays inside the slot
```

`ExperienceSlot` guarantees:

- one `AbortSignal` per mount;
- cleanup on route, module, properties or motion-preference changes;
- requestAnimationFrame queue cancellation;
- render and asynchronous mount error isolation;
- scoped DOM selectors rooted inside the module;
- current viewport and input-capability snapshots;
- an optional polite live region for meaningful state changes;
- `data-experience-*` diagnostics and an `nk:experience-status` browser event.

Modules must treat `mount()` as repeatable. React Strict Mode intentionally mounts, cleans up and mounts again in development.

## Create a service module

Create a dedicated folder. Do not put unrelated services in the same module chunk.

```tsx
// src/interactive/modules/lighting-design/index.tsx
import {AccessibleSvg, createGsapScope, defineExperienceModule, observeInView} from '../..';

const id = 'lighting-design-v1';

export default defineExperienceModule({
  id,
  version: '1.0.0',
  View() {
    return <AccessibleSvg
      viewBox="0 0 1600 900"
      title="Interactive lighting plan"
      description="A room plan showing how the lighting layers work together."
    >
      <g data-layer="ambient" data-motion-sensitive>{/* SVG paths */}</g>
    </AccessibleSvg>;
  },
  async mount({root, motion, signal, frames, select}) {
    const layer = select<SVGGElement>('[data-layer="ambient"]');
    if (!layer || motion === 'reduced') return;

    const scope = await createGsapScope(root, signal);
    observeInView({
      element: root,
      signal,
      onChange(visible) {
        frames.write(() => scope.gsap.to(layer, {autoAlpha: visible ? 1 : 0, duration: 0.35}));
      },
    });
    return scope.dispose;
  },
});
```

Register it without editing the page renderer:

```ts
{
  id: 'lighting-design-v1',
  slot: experienceSlots.service('lighting-design'),
  version: '1.0.0',
  enabled: enabled('LIGHTING_DESIGN'),
  routes: ['/services/lighting-design'],
  reducedMotion: 'adapt',
  load: () => import('./modules/lighting-design'),
}
```

Then add `VITE_EXPERIENCE_LIGHTING_DESIGN=true` only in the deployment where it should be active. A disabled module is neither imported nor mounted.

## Replacement and rollout

Entries targeting the same slot are replacement candidates. The enabled entry with the highest `priority` wins. This allows a new version to be deployed beside the old one, tested, and rolled back without changing the page.

```ts
{
  id: 'lighting-design-v2',
  slot: experienceSlots.service('lighting-design'),
  version: '2.0.0',
  priority: 20,
  enabled: enabled('LIGHTING_DESIGN_V2'),
  load: () => import('./modules/lighting-design-v2'),
}
```

Recommended rollout:

1. Keep the current module enabled at lower priority.
2. Deploy the replacement disabled.
3. Enable the replacement in a preview environment.
4. Run accessibility, device and performance checks.
5. Enable it in production; rollback is one flag change.

IDs are unique across the manifest. The manifest version and module version must match or the slot fails safely.

## SVG rules

- Use `AccessibleSvg` for every scene root.
- Meaningful diagrams require a concise `title` and optional `description`.
- Decorative SVGs must set `decorative` and remain outside the reading order.
- Use a `viewBox`; avoid fixed pixel width and height as the primary sizing mechanism.
- Mark strokes with `data-vector-stroke` when they must remain visually constant while scaling.
- Keep semantic HTML controls outside SVG whenever practical. Keyboard interaction inside SVG requires an explicit focus and reading-order design.

## Motion and accessibility

Each manifest entry chooses one strategy:

- `adapt`: mount the module and use the context's `motion` value to provide a static or reduced alternative.
- `disable`: do not load or mount the module when the user requests reduced motion.

Only motion-sensitive elements should use `data-motion-sensitive`; the scoped stylesheet removes their transitions under reduced motion. Never make animation the only way to reveal essential content. Do not hijack native scrolling, trap focus, animate focused controls away from the user, or announce continuous scroll progress.

## Performance rules

- GSAP and ScrollTrigger are dynamically imported. Do not import them directly in page components.
- Prefer `transform` and `opacity`; avoid layout-changing animation in continuous scroll handlers.
- Use the supplied frame scheduler: DOM measurements in `frames.read()`, mutations in `frames.write()`.
- Prefer `IntersectionObserver` for activation and pause work while off-screen or while the document is hidden.
- Use `ResizeObserver` or container queries for module layout. Do not infer layout from a device name.
- Keep modules independent so Vite can produce one lazy chunk per experience.
- Use `interactive-experience--contained` only when the scene does not need sticky positioning or overflow.
- Use `interactive-experience--deferred` for below-the-fold scenes after verifying that content visibility does not conflict with scroll triggers.

As a starting production budget, target less than 100 KB compressed JavaScript per experience excluding the shared GSAP chunk, no persistent work while off-screen, and no long task over 50 ms during initialisation.

## Responsive design

Every module receives an initial viewport and pointer snapshot. For live changes, use `watchMedia`, `observeElementResize` and CSS container queries. Design at least three behaviours rather than three screenshots:

- narrow/touch: static or tap-led interaction;
- wide/touch: avoid hover-only affordances;
- wide/hover: richer pointer and scroll enhancement.

The underlying page content must remain usable before the module loads, if it fails, and when JavaScript is unavailable.

## Live preview and animation-generation handoff

The electrical-installations v3 studio applies blueprint edits directly to the mounted scene. Desktop, tablet and mobile preview widths are presentation modes of the same scene state, so switching devices never reloads the page or creates a second source of truth.

The studio also exposes a small browser-event contract for an animation generator. Progress can originate in the current window or in another same-origin tab or worker through the `nk-electrical-animation-generation` `BroadcastChannel`.

```ts
window.dispatchEvent(new CustomEvent('nk:animation-generation-progress', {
  detail: {
    phase: 'generating',
    progress: 48,
    message: 'Generating worker motion',
  },
}));

window.dispatchEvent(new CustomEvent('nk:animation-generation-complete', {
  detail: {
    message: 'Animation ready',
    objects: finalSceneObjects,
  },
}));
```

The equivalent cross-context messages are:

```ts
const channel = new BroadcastChannel('nk-electrical-animation-generation');

channel.postMessage({
  type: 'progress',
  detail: {phase: 'generating', progress: 48, message: 'Generating worker motion'},
});

channel.postMessage({
  type: 'complete',
  detail: {message: 'Animation ready', objects: finalSceneObjects},
});
```

On completion, the validated object collection replaces the current blueprint and renders immediately. No refresh, route change or manual reopening is required. Invalid payloads move the studio to an error state without replacing the last working preview.

## Current integration

Every service detail page exposes `experienceSlots.service(serviceSlug)`. The production module, `electrical-installations-journey` version `2.0.0`, is active by default through:

```dotenv
VITE_EXPERIENCE_ELECTRICAL_INSTALLATIONS=true
```

Set the flag to `false` to remove the module without changing the page renderer or CMS architecture. The module combines a fixed generated room plate and consistent worker/material assets with thirteen editable SVG construction layers. Desktop uses a pinned GSAP/ScrollTrigger scrubbed timeline. Mobile and reduced-motion users receive thirteen manual stage controls. The final state exposes two accessible switch controls for the four short shelves and long lower shelf.

The generated asset record and reproducible prompt set are in [ELECTRICAL_INSTALLATION_IMAGEGEN.md](ELECTRICAL_INSTALLATION_IMAGEGEN.md).
