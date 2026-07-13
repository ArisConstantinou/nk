# NK Electrical digital experience

A ground-up React/Vite rebuild of the NK Electrical website, designed around the verified content and links from `nk-electrical.com`.

## Live website

<https://arisconstantinou.github.io/nk-electrical-website/>

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

The development server is fixed to <http://127.0.0.1:5191/>.

## Main routes

- `/` — separate desktop and mobile home experiences
- `/about` — company story and complete faceless illustrated team
- `/electrical-installations` — planning, installation, maintenance and smart systems
- `/projects` — documented installations with project-discussion links
- `/explore` — season, space and category product filtering
- `/lighting` — grouped PDF catalogue library
- `/contact` — store details and email-preparation form
- `/admin` — live local content studio

All audited Wix-era routes redirect to their relevant new destination. Product deep links resolve to individual product pages.

## Content studio

The local-first studio saves to the browser automatically. It supports:

- live editing of hero, story and contact copy;
- local hero-image upload or direct asset paths;
- product creation, deletion, reordering, copy, image path and filter metadata;
- direct drag-to-position editing of the live hero signal marker;
- JSON import/export and a one-click reset to the published defaults.

For a multi-user production CMS, replace the storage adapter in `src/context/ContentContext.tsx` with the chosen authenticated database or headless CMS.

## Asset and license note

- The generated architectural scenes are original AI outputs created for this build without named artists, trademarks, logos or real-person likeness requests. Under OpenAI's terms, output is owned by the user as between the user and OpenAI, subject to applicable law; AI output is not guaranteed to be unique.
- The faceless team characters were generated specifically for this build. The NK logo and product photographs came from the existing NK Electrical website; NK should confirm that it owns or licenses those assets before production publication.
- The animated circuit uses Remotion Player. Remotion's current commercial terms require a paid Company License for collaborations or companies of four or more people. Confirm the applicable Remotion plan before public deployment.
