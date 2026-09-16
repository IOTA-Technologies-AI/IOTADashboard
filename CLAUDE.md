# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository shape

This repo is the **IOTA Dashboard** — an internal ERP-style Next.js app (invoicing, VAT/ZATCA, HR, sales CRM, expenses, NDAs/offers). Everything lives under [next-js/](next-js/); the repo root holds only docs and CI config, and its `package.json` is an empty stub. **All commands run from `next-js/`.**

Two sibling repos are usually checked out alongside and are frequently part of the same change:

| Path | What it is |
|---|---|
| `../IOTAApiServer` | The backend — an **Encore.ts** app (`iotaapiserver-s572`), one directory per service under `iotaapiserver/`. Deployed by pushing to its configured branch. |
| `../IOTADocuments` | A small standalone Vite + React public document viewer. |

A change to a dashboard screen very often needs a matching endpoint in `../IOTAApiServer/iotaapiserver/<service>/` and a migration in `../IOTAApiServer/iotaapiserver/sql/`.

## Commands

```sh
cd next-js
yarn install            # yarn, NOT npm — yarn.lock is the maintained lockfile
yarn dev                # dev server
yarn build              # production build — this is the real CI gate
yarn start              # serve the build on :3032
yarn lint               # eslint src/**
yarn lint:fix
yarn fm:check           # prettier check
yarn fm:fix
yarn fix:all            # lint:fix + fm:fix
yarn clean              # rm -rf .next
yarn re:dev             # clean + install + dev, when the build cache is confused
```

`package-lock.json` in `next-js/` is a stale artifact — never use `npm ci` against it.

**There are no frontend tests.** The build is what catches undefined references and broken imports in this untyped codebase, so run `yarn build` before declaring work done. The backend has vitest (`yarn test` in `../IOTAApiServer/iotaapiserver`) but only one test file.

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs lint and format check as **advisory** (~16 pre-existing `consistent-return` errors and ~320 unformatted files predate the gate) and `yarn build` as the blocking step. [secret-scan.yml](.github/workflows/secret-scan.yml) runs gitleaks on every push/PR plus a weekly full-history sweep — a live ZATCA signing key once reached this org's history.

## Authentication and authorization

This is the part that most often surprises people. The identity chain is:

```
Microsoft Entra ID (provider: 'azure')   ← the real identity provider
  → Supabase brokers the OAuth exchange and issues its OWN session
  → that Supabase access_token is the bearer token the API verifies
  → TOTP second factor, recorded server-side per session
```

- `CONFIG.auth.method` in [src/global-config.js](next-js/src/global-config.js) is `'supabase'`. The Minimal template's other providers (jwt, amplify, firebase, auth0) are all still present under [src/auth/context/](next-js/src/auth/context/) but are dead code — don't take a change there as effective.
- **Always resolve the bearer token via `getLiveAccessToken()`** (`src/utils/jwt-auth.js`). Several past bugs came from reading a `localStorage`/`sessionStorage` snapshot or pinning a token on `axios.defaults` at page load — both go stale. Both [src/lib/axios.js](next-js/src/lib/axios.js) and [src/utils/apiHelper.js](next-js/src/utils/apiHelper.js) install request interceptors that replace any caller-set `Authorization` header with the live token, and *delete* a stale one when there's no session (so the API says "missing token", not "invalid token").
- The Encore gateway auth handler ([../IOTAApiServer/iotaapiserver/auth/auth.ts](../IOTAApiServer/iotaapiserver/auth/auth.ts)) applies four gates in order: signature/issuer/audience → `app_metadata.provider` is an approved SSO provider (blocks self-signup) → subject exists in the IOTA `user` directory → TOTP satisfied for this session. **Role and permissions are always read from the database keyed on the verified subject, never from a token claim or request parameter.**

### Guards and permissions

Roles are `roleId` 1–4 → `regular | manager | admin | superAdmin`.

- [src/app/dashboard/layout.jsx](next-js/src/app/dashboard/layout.jsx) wraps everything in `AuthGuard` → `TotpGuard` → `DashboardLayout`.
- Per-page authorization is the **`PageGuard` / wrapper pattern**: `page.jsx` stays a server component exporting `metadata`, and delegates to a sibling `list-wrapper.jsx` (or similar) marked `'use client'` that renders `<PageGuard><SomeView /></PageGuard>`. Follow this when adding a protected page.
- `PermissionGuard` ([src/auth/guard/permission-guard.jsx](next-js/src/auth/guard/permission-guard.jsx)) resolves in priority order: superAdmin always allowed → always-allowed paths (dashboard root, app home, the authenticator setup page) → per-user explicit permissions → role-default `navPermissions` → otherwise redirect to `/error/403`. Permissions are fetched **once at login** into auth context, so route changes cost no API call and permission edits only take effect on the affected user's next reload.
- Nav is filtered to match, via `src/utils/filterNavByPermissions.js` applied in the dashboard layout to vertical/horizontal/mobile nav and the searchbar. `src/utils/pageAccess.js` holds the localStorage cache (24h TTL, 5-min background revalidation).
- Authorization must also be enforced server-side — `../IOTAApiServer/iotaapiserver/middleware/permissions.ts` is the backend counterpart. A `PageGuard` alone only hides UI.

The root markdown files (`PERMISSION_SYSTEM_IMPLEMENTATION.md`, `BACKEND_PERMISSION_IMPLEMENTATION.md`, `PERMISSION_ERROR_HANDLING.md`, `SECURITY_ANALYSIS.md`, `LIGHTWEIGHT_LAYOUT_GUIDE.md`) are point-in-time implementation notes, useful as background but not guaranteed current.

## Architecture

Built on the **Minimal (minimals.cc) MUI template** — hence a large amount of unused template scaffolding (`src/sections/_examples`, `src/_mock`, `app/auth-demo`, the demo `paths.*` entries). Distinguish IOTA code from template leftovers before assuming something is live.

**Layering — the convention to follow:**

```
src/app/<route>/page.jsx          server component; exports `metadata`, renders the wrapper
src/app/<route>/list-wrapper.jsx  'use client'; PageGuard + the view
src/sections/<domain>/view/*.jsx  page-level views (list/create/edit/details)
src/sections/<domain>/*.jsx       the components that make up those views
src/actions/<domain>.js           SWR hooks + mutations (the data layer)
src/components/*                  domain-agnostic reusable components
```

`src/sections/` is where nearly all real feature code lives. `src/app/` should stay thin.

**Data access.** Three overlapping paths exist; match whichever the surrounding module already uses:
1. `src/actions/*.js` — SWR (`useSWR` + `mutate`) over `src/lib/axios` and the `endpoints` map. Preferred for new list/board screens.
2. `src/utils/apiHelper.js` — direct axios calls to the Encore host, used by older expense/invoice code.
3. `src/app/api/*/route.js` — Next route handlers, used for (a) same-origin proxies that dodge CORS, (b) secrets that must not reach the client (Microsoft Graph/OneDrive, Apollo, email), (c) server-side PDF generation. Note `src/lib/axios` deliberately uses an **empty baseURL in the browser** so calls hit these same-origin proxies, and the configured host only on the server.

**Multi-tenancy by legal entity.** IOTA operates several offices and the executing entity determines the stamp, the legal name in the Parties clause, and the governing law/forum together. [src/utils/iota-offices.js](next-js/src/utils/iota-offices.js) is the single record for that. An unknown or non-executing office (India, UK) must **refuse** rather than fall back to the Saudi entity. The `governingLaw`/`courts`/`legalName` strings are contract text — legal sign-off before editing.

**Subdomain routing.** [src/middleware.ts](next-js/src/middleware.ts) rewrites `aspirants.iotatechnologies.io/<uuid>` → `/candidate-intake/<uuid>` and blocks `/dashboard` and `/auth` on that host, so the public candidate flow never exposes dashboard UI.

**Build/deploy.** Vercel. [next.config.mjs](next-js/next.config.mjs) stamps `NEXT_PUBLIC_BUILD_SHA`/`BUILD_DATE` at build time (git isn't available at runtime), surfaced as `CONFIG.buildLabel` in the settings drawer — quote it in bug reports. Sentry source-map upload and the Sentry webpack plugins are disabled on Vercel, and `config.parallelism = 1` with `NODE_OPTIONS=--max-old-space-size=6144` ([vercel.json](next-js/vercel.json)): the build OOMs on 8 GB machines otherwise. `eslint.ignoreDuringBuilds` is on. Don't "tidy up" these settings.

## Conventions

- **JS/JSX only, no TypeScript** in `next-js/src` (two `.ts` exceptions: `middleware.ts`, `instrumentation.client.ts`). The backend is TypeScript.
- Imports use the `src/...` alias (resolved via `jsconfig.json` baseUrl + the eslint alias resolver) and are sorted by `eslint-plugin-perfectionist` into a fixed group order — external → `@mui/*` → `src/routes` → `src/hooks` → `src/utils` → internal → `src/components` → `src/sections` → `src/auth` → relative — each group sorted by **line length ascending**. `yarn lint:fix` does this for you; hand-ordering imports wastes time.
- Prettier: single quotes, semicolons, 100 cols, es5 trailing commas.
- Route strings live in [src/routes/paths.js](next-js/src/routes/paths.js) — add new routes there rather than hardcoding, since the permission system and nav config key off these paths.
- Nav lives in `src/layouts/nav-config-dashboard.jsx`. A new dashboard module usually needs: the route in `paths.js`, the nav entry, a `navPermissions` column migration in the backend `sql/` folder (see `add_*_nav_permission.sql`), and the `PageGuard` wrapper.
- Commits follow Conventional Commits (`feat(nda):`, `fix(auth):`, `chore:`) with a subject that states the *behaviour*, not the edit.
- **Record every user-visible change in [CHANGELOG.md](CHANGELOG.md) under `## [Unreleased]`, in the same commit.** Version is semver from `next-js/package.json`, bumped with `npm version patch|minor|major`.
- i18n is `react-i18next` with `en/ar/fr/vi/cn` under `src/locales/langs`; Arabic drives RTL via the MUI stylis RTL plugin. Invoice/document wording has its own helper, `src/utils/invoice-i18n.js`.
- `.vscode/cme-cache.json` and `cme-debug.log` are local IDE artifacts and are gitignored — don't commit or act on them.
