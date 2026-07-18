# NK Electrical digital experience

A React/Vite rebuild of the NK Electrical website, designed around the verified content and links from `nk-electrical.com`.

## Live website

<https://arisconstantinou.github.io/nk/>

## Run locally

```powershell
npm.cmd install
npm.cmd run dev
```

The development server is fixed to <http://127.0.0.1:5191/>. The secure admin API requires Node.js 22.5 or newer because it uses the built-in SQLite module.

## Secure admin

The admin is implemented as a separate security boundary while remaining available at `/admin` in the same React application. Start the website and persistent admin API together:

```powershell
npm.cmd run dev:admin
```

Then open <http://127.0.0.1:5191/admin/>. The development runner explicitly permits one-time setup from loopback and locks the endpoint permanently after the owner exists. Every other start mode requires a long random `ADMIN_BOOTSTRAP_TOKEN` before first setup, regardless of proxy topology or `NODE_ENV`.

Admin data is stored in `.data/admin.sqlite` and uploaded media in `.data/media`; both locations are ignored by Git. The API uses server-side scrypt password hashes, HttpOnly same-site sessions, CSRF and origin checks, role permissions, validation, optimistic record versions, revisions and audit logging.

Localhost can also use Firebase Google sign-in when the public Firebase values and matching server verification values are present in `.env.local`. Firebase proves the email, then the local API maps it to an existing active SQLite administrator and issues the same HttpOnly local session; it never creates or elevates a local account. When Firebase or the internet is unavailable, the original local email/password login remains available automatically. Copy the Firebase section from `.env.example`, use the same administrator email on both sides, and authorise both `localhost` and `127.0.0.1` in Firebase Authentication.

When the API runs behind a reverse proxy on the same host, set `ADMIN_TRUST_LOOPBACK_PROXY=true` only if that proxy overwrites (rather than appends untrusted input to) `X-Forwarded-For`. This keeps login and public-form rate limits per client without trusting arbitrary forwarded headers.

Useful checks:

```powershell
npm.cmd run check:admin
```

The complete deployment, backup, migration, permissions, publishing and recovery runbook is in [docs/ADMIN_PRODUCTION.md](docs/ADMIN_PRODUCTION.md).

The modular SVG/GSAP/scroll infrastructure and the contract for future service experiences are documented in [docs/INTERACTIVE_EXPERIENCES.md](docs/INTERACTIVE_EXPERIENCES.md).

For a same-origin Node deployment, run the production build and set `ADMIN_SERVE_SITE=true` before `npm.cmd run start:admin`. GitHub Pages can continue hosting the public static build, but it cannot host the authenticated API; a production admin therefore needs the Node service or an equivalent server deployment/reverse proxy.

## Main routes

- `/` — Systems-theme homepage and live LED response lab
- `/services` and `/services/:service` — service-only routes
- `/shop`, `/shop/:category` and `/shop/product/:id` — products
- `/shop/catalogues` — catalogues and PDF downloads
- `/projects` — filterable completed-project archive
- `/about` — company story, team and partnerships
- `/contact` and `/request-a-quote` — conversion routes
- `/admin/*` — authenticated administration workspace

Audited legacy routes redirect to their relevant destination. Product deep links resolve to individual product pages.

## Content boundary

The public renderer reads only the API's published CMS snapshot and falls back to the bundled defaults if the service is unavailable or a payload is invalid. Draft and archived records never enter the public payload. This preserves the public website during admin/API outages while allowing reviewed, published changes to appear normally.

## Asset and license note

- The generated architectural scenes are original AI outputs created for this build without named artists, trademarks, logos or real-person likeness requests. Under OpenAI's terms, output is owned by the user as between the user and OpenAI, subject to applicable law; AI output is not guaranteed to be unique.
- The faceless team characters were generated specifically for this build. The NK logo and product photographs came from the existing NK Electrical website; NK should confirm that it owns or licenses those assets before production publication.
- The animated circuit uses Remotion Player. Remotion's current commercial terms require a paid Company License for collaborations or companies of four or more people. Confirm the applicable Remotion plan before public deployment.
