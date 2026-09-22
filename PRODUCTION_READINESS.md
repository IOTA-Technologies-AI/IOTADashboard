# Production readiness — IOTA Dashboard

Status: **draft, 2026-09-22.** Written against `dev` at commit `4a1f773`.

The dashboard works. What it is not yet is a *production system*: it points at a
staging API in ninety places, it exposes a handful of privileged endpoints to
anyone who can reach the URL, and nothing but a green build stands between a
broken change and the people using it. This document is the ordered list of work
that closes that gap, the reasoning behind each item, and the cutover itself.

Items are grouped by whether they **block the first production deploy**, should
land **before the app is opened to everyone**, or are **operational** — the
things that matter on the day something breaks rather than on the day we ship.

---

## 0. Decide what "production" means

Before any of the work below, three decisions need an owner. Everything else
depends on them.

| Decision | Options | Notes |
|---|---|---|
| **Production API environment** | A new Encore environment (`prod`) in `iotaapiserver-s572`, or a separate Encore app | A separate environment is the lighter path: same code, own database, own secrets, own URL. |
| **Production database** | New empty DB, or promote the staging DB | Staging holds test invoices and real-looking VAT records. If any of it is real, promoting it makes that data authoritative — a ZATCA concern, not just a data concern. |
| **Identity** | Same Entra tenant + same Supabase project, or a separate production Supabase project | Separate is cleaner, but every user re-enrols their authenticator, because TOTP secrets live per project. That is a people cost, not a technical one — schedule it. |

Until these are answered, the environment-variable matrix in §3.2 cannot be
filled in, and items B1 and B5 cannot be finished.

---

## 1. Blockers — must be done before the first production deploy

### B1. The staging API host is hardcoded in ~90 places

`https://staging-iotaapiserver-s572.encr.app` is a literal in **30+ files**,
including every `/api/*` proxy route, `src/utils/apiHelper.js`, and page
components under `src/app/dashboard/finance/`. A production deployment with a
correct `NEXT_PUBLIC_SERVER_URL` would still send most of its traffic to
staging — writing production invoices into the staging database.

The fix is not a find-and-replace to a production literal; that just moves the
problem. Route every caller through the two clients that already resolve the
host from configuration:

- `next-js/src/lib/axios.js` — same-origin `/api/*` proxies (client) / API host (server).
- `next-js/src/lib/iota-api.js` — direct calls to the Encore gateway. *(Added
  2026-09-22; `src/actions/commission.js`, `src/actions/jobs.js` and
  `src/actions/employee-vetting.js` already use it.)*

and give the `/api/*` route handlers a single shared `resolveApiHost()` helper
instead of each redeclaring `normalizeHost` and its own fallback. **Keep the
fallback** — an unset `NEXT_PUBLIC_SERVER_URL` producing the string
`"undefined/expenses"` is a failure mode this codebase has already had — but
point it at nothing useful in production, or better, fail the build when the
variable is missing and `NODE_ENV === 'production'`.

Done when: `grep -rn "staging-iotaapiserver" next-js/src | wc -l` returns `0`,
and a CI step keeps it there.

### B2. Eight route handlers do privileged work with no caller check

**No route handler in `next-js/src/app/api/` verifies who is calling.** For most
of them that is correct — they forward the caller's bearer token upstream and
let the Encore gateway decide. But these use *their own* credentials and check
nothing:

| Route | What it does with no authentication | Exposure |
|---|---|---|
| `api/email/send` | Sends mail via Resend as `iota@emails.iotatechnologies.io` | Anyone on the internet can send mail from an IOTA address |
| `api/graph/users` | Microsoft Graph client-credentials token, lists the directory | Full staff directory enumeration (name, mail, UPN) |
| `api/proxy/expenses/[[...path]]` | Attaches a Supabase **service-role** key to any method and path under `/expenses` | Potential read/write of expense data outside the permission model |
| `api/rbac/manager-users` + `api/rbac/managerUsers` | Service-role key; `POST` writes manager↔user assignments | Privilege assignment without an identity — the two files are byte-identical duplicates |
| `api/fetchZohoInvoices` | Zoho OAuth token | Third-party billing data |
| `api/onedrive/*` (files, search, shared, download, items) | OneDrive access on IOTA's own storage | Document access |
| `api/banking/parse-statement` | Ships an uploaded PDF to `iota-pdf-parser.onrender.com` | Unauthenticated use of a paid external parser; arbitrary upload |
| `api/generate-offer-pdf` | Renders an offer PDF from a posted body | Document generation as IOTA |

`AuthGuard`, `TotpGuard` and `PageGuard` are **client-side React** — they do not
run for a `curl` against `/api/...`. `src/middleware.ts` runs on these paths but
only does subdomain rewriting.

Two things are needed:

1. **A server-side auth helper for route handlers** — read the `Authorization`
   header, verify the Supabase JWT (signature, issuer, audience, expiry), and
   return the subject. Then each credentialed route starts with it, and the ones
   that need more than "is signed in" check role or permission on top.
2. **Delete what should not exist.** `api/proxy/expenses/**` and one of the two
   `rbac` duplicates look like leftovers from before the gateway enforced auth.
   Confirm nothing calls them, then remove them rather than securing them.

This is the single largest piece of work on the list. It is also the one that
would be embarrassing to discover after launch rather than before it.

### B3. A service-role key is read from a `NEXT_PUBLIC_` variable

`api/proxy/expenses` and both `rbac` routes fall back to
`process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`. Anything prefixed
`NEXT_PUBLIC_` is **inlined into the client bundle by Next.js**. If that variable
is set in any Vercel environment, the Supabase service-role key — which bypasses
row-level security entirely — is being served to every browser that loads the
app.

Check Vercel's environment variables for all three environments now. If it is
set: rotate the key in Supabase, remove the variable, and treat it as a
disclosed secret (this org has had one of those before — hence the weekly
gitleaks sweep in `.github/workflows/secret-scan.yml`). If it is not set, still
remove the reference so it cannot be set by accident.

### B4. A bearer token is committed in source

`next-js/src/utils/apiHelper.js:29` — `PARTER_AUTH_TOKEN`, a base64 basic-auth
credential for the partner invoice API, in git history. Move it to an
environment variable read server-side, rotate the credential with the partner,
and confirm gitleaks' allowlist is not what is keeping it quiet.

### B5. Backend, database and migrations

The dashboard cannot go to production alone.

- Stand up the production Encore environment and its secrets (IDfy BGV, ZATCA
  signing, Resend, Graph, Apollo, Zoho, OneDrive).
- Apply `../IOTAApiServer/iotaapiserver/sql/` to the production database **in
  order**, and write down which files have been applied. There is no migration
  runner — the folder is the record, and "which of these has run" is currently
  answerable only by inspecting the schema.
- Seed the `user` directory and `navPermissions` rows. A production database
  with an empty `user` table rejects every login at the gateway's third gate,
  which presents as a successful Entra sign-in followed by a dashboard where
  nothing loads.
- Verify `../IOTAApiServer/iotaapiserver/middleware/permissions.ts` covers every
  endpoint the dashboard's `PageGuard`s protect. A guard with no server-side
  counterpart is a hidden menu item, not access control.

---

## 2. Before opening it to everyone

### 2.1 Make failures visible

The bug that prompted this document — cost-center and expense-type dropdowns
silently empty because the token never reached the proxy — was invisible for as
long as it existed, because the helpers return `[]` on error and the form treats
an empty list as "leave it alone":

```js
// src/utils/apiHelper.js — the shape repeated across ~8 helpers
catch (error) { console.warn('⚠️ Cost center fetch failed:', ...); return []; }
```

A user sees an empty dropdown and assumes nobody has configured cost centers
yet. Nobody files a bug. Fix the pattern, not just the instance: let these
helpers reject, have callers render an error state with a retry, and report the
failure to Sentry. An empty list should mean *the list is empty*.

### 2.2 Turn on the diagnostics we already pay for

- **Sentry source maps are disabled on Vercel** (`next.config.mjs`), so every
  production stack trace will be minified. Re-enable upload for the production
  build — it was turned off for build memory, so measure it rather than assume.
- **`onRequestError` is not wired up** — the build prints a Sentry warning on
  every run. Server-component errors are not being captured.
- **137 `console.log` calls in `src/`**, several printing user context, tokens'
  surrounding state and full API payloads to the browser console. Strip the
  debug logs (the `🔍 ExpenseNewEditForm` block is a good example), keep
  deliberate `console.error`s, and consider `removeConsole` in the production
  build.

### 2.3 Stop the auth-plumbing bug class from recurring

This has now happened three times — vetting pages, the nav-permission fetch, and
the expense form — each time for the same reason: **there are four ways to reach
the API and only two of them are authenticated by construction.**

| Path | Token attached by | Safe by construction? |
|---|---|---|
| `src/lib/axios.js` (SWR, `/api/*` proxies) | Own interceptor | Yes |
| `src/lib/iota-api.js` (direct to gateway) | Own interceptor | Yes |
| `src/utils/apiHelper.js` | Interceptor on the **default axios instance**, registered as an import side effect | Only if that module is in the route's bundle |
| bare `import axios from 'axios'` elsewhere | Nothing of its own — inherits the above, or does not | **No** |

Three steps, in order of value:

1. **Make the safe paths the only paths.** Move the interceptor out of
   `apiHelper.js` so no module's correctness depends on another module having
   been imported first, and port `apiHelper`'s callers onto the shared clients.
   `apiHelper.js` is ~3,300 lines and does far more than transport; this is a
   sustained refactor, not an afternoon.
2. **Ban the unsafe one with lint.** An ESLint `no-restricted-imports` rule on
   bare `axios` outside `src/lib/`, with a message pointing at the two clients.
   This is cheap and catches the next occurrence at author time.
3. **Assert it in CI.** A script that fails the build when a file under
   `src/app/api/` uses credentials without checking the caller, or when a
   hardcoded API host reappears. I can write this — say the word.

### 2.4 A test suite worth the name

There are **no frontend tests**; `yarn build` is the only gate, and it catches
undefined references, not wrong behaviour. Before the app carries real invoicing
and VAT traffic, it needs at minimum:

- Playwright smoke tests over the flows where a silent failure costs money:
  sign-in + TOTP, create an expense, create and approve an invoice, generate a
  ZATCA-stamped document, sign an NDA/offer.
- Unit tests on the pure logic that has legal weight: `src/utils/iota-offices.js`
  (an unknown office must *refuse*, not fall back to the Saudi entity), VAT
  arithmetic, invoice numbering, currency conversion.
- Make `yarn lint` blocking once the ~16 pre-existing `consistent-return` errors
  are fixed, and `yarn fm:check` blocking after one repo-wide `yarn fm:fix`
  commit. They are advisory today for good reasons that stop applying the moment
  the backlog is cleared.

### 2.5 Cleanup that reduces the surface

- Remove the dead auth providers (`jwt`, `amplify`, `firebase`, `auth0` under
  `src/auth/context/`) and their `NEXT_PUBLIC_FIREBASE_*` / `NEXT_PUBLIC_AWS_*`
  config. They are template leftovers that read like live alternatives.
- Remove the Minimal template demo surface — `src/sections/_examples`,
  `src/_mock`, `app/auth-demo`, `/product`, `/post`, `/pricing`, `/payment`,
  `/faqs` — from the production build. Several are megabyte-plus routes that
  ship today.
- Delete the duplicate `rbac` route (see B2).

---

## 3. Operational readiness

### 3.1 Domains, DNS and CORS

- `dashboard.iotatechnologies.io` → production Vercel project.
- `aspirants.iotatechnologies.io` → same deployment; confirm
  `src/middleware.ts` still blocks `/dashboard` and `/auth` there, and that the
  candidate-intake flow works on the production API.
- Entra: add the production redirect URIs. Supabase: set Site URL and the
  redirect allow-list to the production origins **only**.
- Encore: restrict CORS to the production origins.

### 3.2 Environment-variable matrix

Write the authoritative list down — there is no committed `.env.example`, so the
required variables are currently discoverable only by grepping. Per environment
(preview / production), at least: `NEXT_PUBLIC_SERVER_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_TOTP_REAUTH_HOURS`, `NEXT_PUBLIC_AZURE_ROLE_*`, `GRAPH_*`,
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `PDF_PARSER_URL`, `SENTRY_*`, Apollo,
Zoho and OneDrive credentials.

Rule to apply while writing it: **if it is a secret, it must not start with
`NEXT_PUBLIC_`** (see B3).

### 3.3 Backups, rollback, monitoring

- Database: automated backups on, retention agreed, and a **restore actually
  rehearsed once**. An untested backup is a belief, not a backup.
- Rollback: Vercel's instant rollback covers the frontend. The backend does not
  roll back cleanly if a migration has run — so every migration must be
  additive, and a deploy that needs a destructive one needs a written plan.
- Monitoring: Sentry alerting to a channel someone reads; uptime checks on the
  dashboard and the Encore gateway; an alert on 401 rate, which is the signal
  that would have caught all three auth bugs within minutes.
- Name who is on call for the first two weeks and how they are reached.

### 3.4 Data, legal and access

- Retention and residency for invoices/VAT under ZATCA rules; confirm where the
  production database physically lives.
- Vetting data (IDfy payloads) and candidate intake data are personal data —
  confirm retention and who may see the internal, unmasked vetting report.
- Review production role assignments before launch: who is `superAdmin`, and
  why. Permissions are cached for 24h in `localStorage` with 5-minute
  revalidation, so a revocation is not instant — know that number before relying
  on it in an incident.
- Rotate every credential that has been shared in chat, email or a screen share
  during development.

---

## 4. Cutover

Run in this order; each step is verifiable before the next.

1. Freeze `dev`. Cut a release branch.
2. Deploy the backend to the production Encore environment; run the SQL; seed
   users and nav permissions.
3. Smoke-test the API directly with a real token (sign-in, TOTP, a read, a write).
4. Deploy the dashboard to the production Vercel project with the full env matrix.
5. Smoke-test in the browser against a checklist: sign in → TOTP → dashboard
   loads with the right nav → create an expense (**cost centers and expense
   types populate** — the check this document was born from) → create an invoice
   → generate a document → sign out.
6. Pilot with 3–5 users for a week before opening it to everyone.
7. Tag the release: `npm version minor` in `next-js/`, rename `## [Unreleased]`
   in `CHANGELOG.md` to the version and date. The build stamp
   (`CONFIG.buildLabel`) in the settings drawer is what a bug report should
   quote.

### Go / no-go

Do not launch with any of these unticked:

- [ ] No `staging-iotaapiserver` literal remains in `next-js/src` (B1)
- [ ] Every credentialed route handler authenticates its caller (B2)
- [ ] No secret is exposed via a `NEXT_PUBLIC_` variable (B3)
- [ ] The committed partner token is rotated and removed from source (B4)
- [ ] Production DB migrated, seeded, backed up, and a restore rehearsed (B5, 3.3)
- [ ] Sentry receives errors from production with usable stack traces (2.2)
- [ ] Smoke checklist passes end to end against production (step 5)
- [ ] Someone is on call and knows how to roll back (3.3)

---

## First two weeks after launch

Watch the 401 rate, Sentry's top issues, and the build stamp in incoming bug
reports. Keep the pilot group's feedback loop short. Resist shipping features
until the test suite from §2.4 exists — the reason this document opens with an
auth bug found by a user rather than by CI is that, today, a user *is* the CI.
