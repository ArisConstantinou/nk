# NK Electrical admin production runbook

## Architecture

The public React application and the admin interface share the same build, while the admin API is a separate Node.js security boundary under `/api/admin`. Published CMS snapshots are the only records returned by the public endpoint. Draft history, reusable-editor libraries and unpublished global definitions never enter the public payload.

Persistent state is split between:

- SQLite (`ADMIN_DB_PATH`) for users, sessions, content, revisions, navigation, forms, submissions, enquiries, media metadata, favorites and audit events.
- The media directory (`ADMIN_MEDIA_PATH`) for originals and generated responsive variants.
- The Vite `dist` directory for immutable application assets.

The API applies schema changes idempotently at startup and records the applied schema version in `schema_migrations`. `/api/admin/health` reports the current schema version and storage state without exposing filesystem paths or secrets.

## Required production configuration

Use Node.js 22.5 or newer. Copy `.env.example` into the deployment platform's secret/environment configuration; do not commit a populated environment file.

Required decisions:

- Set `NODE_ENV=production` so session cookies require HTTPS.
- Set `ADMIN_ALLOWED_ORIGINS` to the exact HTTPS website origin. Multiple values are comma-separated.
- Set a long, random `ADMIN_BOOTSTRAP_TOKEN` before the first owner is created, then rotate or remove it after setup.
- Keep `ADMIN_ALLOW_LOOPBACK_SETUP=false` outside the local development runner.
- Use absolute persistent paths for `ADMIN_DB_PATH` and `ADMIN_MEDIA_PATH` in container/server deployments.
- Set `ADMIN_SERVE_SITE=true` only when the Node process should serve `dist` and the API from one origin.
- Set `ADMIN_TRUST_LOOPBACK_PROXY=true` only when a trusted local reverse proxy overwrites `X-Forwarded-For`.

Terminate TLS at the reverse proxy or hosting platform and proxy `/api/admin/*` without caching. Preserve `Set-Cookie`, `Origin`, range requests and response security headers. Apply request-size limits of at least 36 MB to the media upload routes and smaller limits to all other API routes.

### GitHub Pages authentication

The static GitHub Pages build uses Firebase Authentication instead of the Node session API. Configure a Firebase web app, enable Google sign-in, add `arisconstantinou.github.io` to Authentication → Settings → Authorised domains, and set these GitHub repository variables: `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`, and `FIREBASE_ADMIN_EMAILS`. The email list is comma-separated. Set `FIREBASE_EMAIL_PASSWORD_ENABLED=true` only when the Email/Password provider and an administrator account have also been configured.

Firebase web configuration is public by design and is not an administrator credential. Access is established by Firebase Authentication; any future Firestore or Storage data must additionally be protected with Firebase Security Rules and App Check. The current Pages workspace content remains local to the signed-in browser and is not a replacement for the server-backed SQLite CMS.

### Optional localhost Firebase sign-in

The development admin can prefer Firebase Google sign-in while retaining the original local credentials as an offline fallback. Put the `VITE_FIREBASE_*` values plus `FIREBASE_API_KEY` and `FIREBASE_ADMIN_EMAILS` in the ignored `.env.local` file, and add `localhost` and `127.0.0.1` to Firebase Authentication's authorised domains. `npm run dev:admin` passes these values to both Vite and the local API.

After Firebase signs in, the browser sends its short-lived ID token to `/api/admin/firebase-login`. The local API verifies it with the Firebase Identity Toolkit, requires a verified allow-listed email, and maps that email to an existing active SQLite administrator before issuing the normal HttpOnly/CSRF session. Firebase therefore cannot create a local user, change a role or bypass local API permissions. If token verification cannot reach Firebase, the login screen keeps the original local email/password form active.

## Initial deployment

1. Install exact dependencies with `npm ci`.
2. Run `npm run check:admin`.
3. Back up any existing database and media directory.
4. Run `npm run build`.
5. Start the API with `npm run start:admin` under a supervised service manager.
6. Confirm `/api/admin/health` returns `ok: true`, the expected `schemaVersion`, `database: ok` and `media: ok`.
7. On a new installation, create the first owner once with the bootstrap token. Confirm `/api/admin/setup` then reports `needsSetup: false`.
8. Sign in, verify the dashboard, open a page in the visual editor, save a draft, preview all three viewports, and publish a reviewed change.

## Permissions model

- `owner`: full content, media, settings, users, audit and destructive operations.
- `editor`: site content, SEO, settings, navigation, forms and site-scoped media.
- `shop`: products, catalogues and shop-scoped media only.
- `projects`: projects and project-scoped media only.
- `sales`: enquiries and form submissions.
- `viewer`: read-only access to authorised administration data.

The server enforces permissions for every route; hidden navigation is not treated as security. All mutating authenticated requests require a same-site session, an allowed `Origin` and a matching CSRF token. Record writes use optimistic versions to prevent silent overwrites.

## Draft, preview and publish workflow

- Inline edits, drag-and-drop changes and property edits update only the in-memory preview first and are autosaved as drafts.
- The visual bridge discovers every visible leaf text node, image, icon, button and link in the real header, page and footer. It gives each element a deterministic object key, while explicit CMS bindings continue to take priority.
- Automatically discovered objects persist through validated `visualOverrides` (text, source, destination, icon and visibility) and `visualPlacements` (drop target and before/after position). Header/footer overrides belong to Global settings; page content belongs to its page, service or product record.
- Every visible hit area in `header`, `main` and `footer` is resolved to an editable object, including structural containers, controls, SVG icons and CSS background images. Explicit content bindings are also given stable movement/deletion identities, so direct text and media remain individually draggable instead of requiring a separate handle.
- Automatic and structured objects can be dragged, reordered or deleted. Automatic objects may be dropped on any editable destination, including a destination owned by another rendered content record. Deleted objects hide immediately, remain recoverable from the selected record's inspector, and all edit/move/delete/restore operations participate in page-level and independent object-level undo/redo.
- Removing or undoing an override restores the original text, image, link, icon, background or DOM position rather than leaving a stale preview mutation behind.
- The editor shows `Saving`, `Saved`, `Draft` and `Published` state explicitly. Closing a dirty editor triggers a warning and flushes queued saves during normal unmounts.
- Preview messages patch only changed records, avoiding a full CMS payload on every keystroke.
- Publishing runs strict page readiness validation and blocks missing/inactive managed media.
- Global component edits synchronize the matching draft instances. The published global definition is resolved by the public API only after Global settings are published.
- Page history and object history remain editor-only. Object undo/redo targets only the selected object; page undo/redo targets the full editor timeline.
- The sidebar's `Guide / Οδηγός` action opens the complete 22-step English/Greek guided tour for an owner. It explains Search, all three sidebar groups, every destination, the guide itself, profile/session and Sign out. The available step count follows role-based visibility, traps keyboard focus and supports Escape and arrow-key navigation.

## Brand assets

`/assets/nk-logo-transparent-v2.png` is the transparent NK logo generated from the source mark. The public header intentionally adds no image background, padding or border, so the logo remains transparent on every theme surface.

## Media operations

Uploads validate MIME signatures, filename metadata and size. Images are inspected and receive responsive WebP variants. Replacement preserves the asset ID and public URL and is limited to the same media family so an image cannot silently become a PDF or video. The file endpoint streams content and supports byte ranges for efficient video/document delivery.

Before deleting media, the API scans draft and published content usage. Keep originals and every generated variant in the same persistent media volume. If the health endpoint reports unavailable media storage, stop publishing and restore the volume or backup first.

## Backups and recovery

Back up the database and media directory as one recovery set. For a consistent online SQLite backup, use a platform snapshot or SQLite's backup command; do not copy only the database file while writes are active. Retain multiple dated generations and regularly test restoration into an isolated environment.

Rollback procedure:

1. Stop the admin API to prevent writes.
2. Preserve the failed database and media directory for investigation.
3. Restore the last matching database/media backup.
4. Deploy the previous application release if the incident was code-related.
5. Start the service and verify health, login, media delivery and the published public snapshot.

Content mistakes normally do not require a database rollback: use the record revision history to restore an earlier draft, review it in preview and publish it as a new version. Audit entries are append-only from the interface and identify who changed what and when.

## Migration policy

Startup migrations are additive and idempotent. Every future schema change must:

1. Use a new monotonically increasing migration version.
2. Preserve existing columns/data or include an explicit data transformation.
3. Add indexes only after confirming the affected query.
4. Be covered by the isolated API lifecycle test.
5. Be tested against a copy of the production database before release.

Never delete a column or rewrite production content in the same release that introduces its replacement. Use an expand/migrate/verify/contract sequence across releases.

## Release verification

Run this before every release:

```powershell
npm.cmd ci
npm.cmd run check:admin
```

The API test creates an isolated temporary database/media directory and covers owner bootstrap, authentication, CSRF, role boundaries, batched content access, optimistic locking, publish validation, draft/publish state, validated automatic visual overrides and placements, unsafe visual-link rejection, editor-history isolation, revisions, public-data isolation, global component resolution, forms, submissions, media signature/range/replacement behavior, favorites, dashboard data and paginated audit history. The production build then performs TypeScript validation and creates the optimized Vite bundles.

After deployment, perform a browser smoke test at desktop and mobile sizes and inspect console/network errors. Confirm that admin draft changes are visible in live preview but absent from the public site until publication.

For literal visual-editor coverage, inspect every rendered record and confirm that every visible pointer hit target resolves to `[data-visual-kind][data-visual-path]`, every directly bound object has `draggable="true"`, and every object has both `data-visual-object-type` and `data-visual-object-id`. Repeat the check at 1440, 768 and 390 pixel preview widths. Exercise inline edit, pointer drag, immediate delete/restore and object-level keyboard undo/redo without publishing test content.
