# Interactive Experience Platform

The interactive system has two deliberately separate layers:

1. The existing module framework resolves a route/slot, lazy-loads one module, isolates failures and cleans up optional runtime adapters.
2. The data-driven frame engine renders an `ExperienceDocument`. The engine has no service-specific logic. A service module only chooses which published document/template to load.

The first template is `electrical-installations`; future services use the same schema, renderer, Studio and publish endpoints.

## Source layout

```text
src/interactive/
  adapters/                    Optional GSAP/ScrollTrigger and native scroll adapters
  core/                        Module registry and lifecycle
  engine/
    schema.ts                  Generic, versioned document model
    documentValidation.ts      Client-side structural guard
    ExperienceStage.tsx        Reusable SVG renderer
    ExperiencePresentation.tsx Public page/focus/fullscreen presentation
    usePublishedExperience.ts  Published-only loader with release fallback
  studio/
    StudioStage.tsx            Direct manipulation and vector drawing
    StudioPanels.tsx           Stable-ID frame/layer organisation
    AssetManager.tsx           Collapsible, movable asset groups
    exportMockup.ts            Manual SVG/PNG export and AI prompt copy
    useInteractiveDraft.ts     Secure draft/publish client
  templates/                   Data only; never engine behaviour
  modules/                     Small route-specific loaders
```

Backend storage lives in `interactive_experiences` and `interactive_revisions`. All create, save and publish requests require:

- an authenticated server session;
- an `owner` or `editor` role;
- an allowed origin;
- a current CSRF token;
- the expected record version.

The public endpoint returns only `published_data`. Saving a later draft does not change the published response.

## Document model

Every document uses a fixed 1920 × 1080 logical stage. SVG `viewBox` scaling preserves aspect ratio; display size is not stored in the content.

```text
ExperienceDocument
  stage (1920 × 1080)
  settings
  assetGroups[]
    assets[]
  sections[]
    stable id
    visual position = array order
    focus point
    layers[]
      stable id inside the frame
      type + vector/asset data
      transform
```

Visual frame numbers are derived from array order. Removing or reordering a frame changes only its displayed number; stable IDs do not change.

Layers belong to one frame. The renderer never merges layers from different frames. For traditional frame-by-frame composition, duplicate the previous frame and replace only the layers that change. This keeps the wall/camera/floor pixel-aligned.

## Admin workflow

`/admin/interactive` is a real protected admin route and is not available in the static device-only admin mode.

1. Add a blank frame or duplicate the previous frame.
2. Draw a vector mockup or drag a Media reference from a grouped asset library.
3. Select a layer directly. Drag to move; use the cyan corner to resize, the circle to rotate and the orange diamond to skew.
4. Reorder frames/layers by drag. Names update live.
5. Export the active frame manually as 1920 × 1080 SVG or PNG, or copy the prepared AI prompt. No external API is called.
6. Save the private draft.
7. Use Done to test presentation behaviour.
8. Publish explicitly.

Desktop presentation advances one frame per wheel action while the experience can move in that direction. At the first/last frame, normal page scrolling continues. Touch layouts expose large Previous/Next buttons. Reduced-motion users receive the same information without dependent continuous animation.

## Surface calibration

The Studio can turn simple editable guide lines into semantic placement targets:

1. Draw or select a horizontal wall–floor line and a vertical wall-corner line.
2. Add a diagonal floor-depth line when the frame includes a side wall.
3. Choose **Detect surfaces** in the Surface calibration panel.
4. Select the resulting main wall, side wall or floor before applying an asset, or drag an asset directly over the intended surface.

Detected guides are tagged with stable roles. Moving a tagged guide recalculates the affected surface polygons automatically. Walls can be marked flat or curved, surfaces can be renamed independently, and asset layers keep their surface reference for later refitting. Calibration guides and Studio-only surface overlays are excluded from public presentation and exported mockups.

## Asset policy

Asset groups may contain version-controlled public site assets or references to the secure CMS Media library:

- no base64/data-URL content in the document;
- no automatic AI generation;
- no API billing;
- removing a library reference does not silently delete a CMS media file;
- missing assets render an explicit placeholder instead of a broken browser image.

Future generated people, wall states, conduits and fittings must share the same camera, floor datum and 1920 × 1080 composition. The exported mockup and copied prompt are the source-of-truth handoff.

## Adding another service

1. Create a data template in `src/interactive/templates/`.
2. Add a tiny module that calls `usePublishedExperience(newSlug, releaseTemplate)`.
3. Render `ExperiencePresentation`.
4. Register the module in `experienceManifest.ts` against the service slot.

Do not add service rules, section names, electrical stages or asset assumptions to `engine/` or `studio/`.

## Optional motion adapters

GSAP and ScrollTrigger remain lazy optional adapters for future modules. They are not required by the frame engine and must not be imported by page components. Any future continuous motion must:

- respect reduced-motion;
- scope selectors to the module root;
- clean up on route/unmount;
- avoid making essential information animation-only;
- keep the document model authoritative.
