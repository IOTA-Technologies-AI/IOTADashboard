# Changelog

All notable changes to the IOTA Dashboard are recorded here.

The version is [semantic versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

| Segment | Bump when | Command |
|---------|-----------|---------|
| **MAJOR** | Breaking change — a workflow, route or API contract others depend on changes shape | `npm version major` |
| **MINOR** | New capability, backwards compatible — a new screen, a new field, a new endpoint | `npm version minor` |
| **PATCH** | Fix or cosmetic change — a bug, wording, spacing, an icon | `npm version patch` |

`npm version` applies the cascading resets on its own: a minor bump zeroes the
patch segment, a major bump zeroes both. It also commits the change and tags the
commit, so the tag and the shipped version can never disagree.

**Add your entry to `## [Unreleased]` in the same commit as the change.** On
release, rename that heading to the new version with today's date and start a
fresh `Unreleased` block. The deployed build reports its version and commit in
Settings → the footer, so an entry here is traceable to the exact bundle a user
is running.

---

## [Unreleased]

### Added
- Employee Vetting under HR: background verification through IDfy. A new
  Management > HR > Employee Vetting screen lists vettings, a form selects which
  checks to run and collects exactly the fields each one needs, and a details
  page polls IDfy for outstanding results and shows each check's raw response.
  Checks span identity (PAN, Voter ID, Indian and international passport,
  driving licence), criminal and legal history (court record, instant court
  screening, cybercrime), sanctions/PEP (AML with adverse media), employment
  history (EPFO, ESIC) and email verification — the operator chooses which
  apply. Requires deploying `../IOTAApiServer` and running
  `sql/create_employee_vetting_table.sql`, which also seeds the IDfy appConfig
  row and the nav permission (withheld from the regular role by default). IDfy
  credentials live in one `appConfig` row (namespace `idfy`, key `credentials`)
  holding `apiKey`, `accountId` and an overridable `baseUrl`; the endpoints
  refuse to call IDfy while either credential is still the placeholder.
- Resource tabs on a resource calculation: one tab per quoted resource, each
  showing its name, quantity and monthly figure. Selecting a tab switches the
  whole editor — the resource fields AND every cost component — to that
  resource, making it explicit that each person on a proposal is costed on their
  own salary, benefits and line items rather than a shared calculation. Only the
  proposal terms (customer, office, currency, notes, validity) are shared.
  Duplicate copies the open resource's components as a starting point; Add
  Resource starts from the office template.
- Multi-resource proposals: one quotation can now cover several people under a
  single ID, instead of raising a separate quotation per candidate. Each
  resource is priced on its own terms — nationality, salary, family status,
  insurance plan and line items all vary per row — while the commercial terms
  (customer, issuing office, currency, validity, notes, T&Cs and the approval
  workflow) are shared across the proposal. A resource list in Proposal Details
  adds, copies, removes and switches between them.
- A "Number of resources" quantity per row, for repeated identical roles
  (3 x Java Developer) without entering three near-identical resources. The
  quotation prints it as a new QTY column, with a "3 x SAR 38,000 per month
  each" note, and the proposal totals multiply by it.
- The quotation PDF and the on-screen summary now print one row per resource
  with its own scope bullets, plus proposal-level "Resources Quoted" and "Total
  Headcount". The internal cost breakdown is grouped per resource.
- Resource quotation PDF now carries the proposal's own title, its reference,
  the date of issue and a 30-day validity date — in the document body, in the
  PDF's title metadata (so the title shows in the viewer's tab) and in the
  filename, which is now `IOTA-Resource-Quotation-<title>-<customer>-<ref>.pdf`
  instead of `quotation-<timestamp>.pdf`.
- Resource quotation PDF gained a details grid (customer, issuing entity,
  resource, position/job description, nationality, family status, insurance
  plan, currency, status), an explicit tax line, the monthly instalment, the
  notes entered on the form, and standard terms & conditions. The same grid now
  appears on the Quotation Summary card, so the page and the download match.
- Resource quotation share menu: "Download with cost breakdown (internal)" —
  a per-component cost table kept out of the customer-facing quotation.
- Proforma invoice module: list, details and print views, raised automatically
  when a source invoice is approved.
- Proforma edit page — the addressee (customer name, Kind Attn., address,
  Prepared For) and the commercials (line items, discount, shipping, VAT) are
  editable after the proforma is raised.
- Option to send a proforma as an order without pricing: drops the price and
  total columns and the totals block from the printed document. Individual
  lines can also be left unpriced on an otherwise priced document.
- Customer ID on the printed proforma, derived from the customer name on a
  phone keypad — `IOTA` + issuing office country + first six letters of the
  customer name, e.g. `4682-572-749232` for RIYAD BANK out of Riyadh.
- App version and build stamp in `CONFIG`, surfaced in the settings drawer.
- This changelog.

### Changed
- Changing the IOTA office on a multi-resource proposal now warns that cost
  components are per office and that resources other than the open one were not
  reseeded, rather than silently mixing two countries' cost structures.
- Resource quotation email and WhatsApp share messages now quote the title,
  reference, validity, issuing entity and notes rather than totals alone.
- Proforma page 2 header: logo and wordmark moved to the left, document number
  right-aligned.
- Proforma page 2 meta row: IOTA address moved to the left and broken into
  postal-style lines; date, validity and Customer ID moved to the right.
- Proforma cover logo enlarged by 50%.
- Proforma nav icon is now `RequestQuoteIcon` rather than the reused invoice glyph.
- The stored-settings cache-buster is now `SETTINGS_SCHEMA_VERSION`, independent
  of the release version. Previously tied to `CONFIG.appVersion`, which would
  have reset every user's saved theme and layout on every release.

### Fixed
- **Backend fix — requires deploying `../IOTAApiServer`.** The expense and
  vendor lists returned 401 "Authentication required" for every user, always.
  `requirePermission()` took the user context as its FIRST parameter, but all
  four call sites in `supabase/supabase.ts` passed only the path — so `user` was
  the path string, `user.email` was `undefined`, and the guard threw before any
  permission was ever checked. `/expenses` (x3) and `/vendors` were unreachable
  for everyone regardless of who was signed in or which token they sent; no
  frontend change could affect it. The function now takes `(requiredPath,
  requiredRoles?)` and reads the identity from the gateway's verified auth data
  via `getAuthData()`, keeping role and permissions keyed on the verified
  subject rather than any request parameter.
- Expenses, vendors and IOTA billing failed with 401 "Authentication required"
  for a signed-in user. The request interceptors resolve the bearer token from
  the live Supabase session and send NO Authorization header when that comes
  back empty — but it comes back empty for reasons that are not "signed out",
  notably supabase-js not having finished restoring the session when a list
  fetches on mount. The gateway then rejected the call before its own auth
  handler ran. Token resolution now falls back to the stored token while it is
  still unexpired, and the expense and vendor lists wait for the session to be
  established before fetching. An expired token is still never sent.
- A resource calculation for the India office stored a total that contradicted
  the one on its quotation. India quotes a single agreed invoice amount, which
  is what the dashboard has always printed, but the API totalled every active
  cost component instead. Both now apply the India rule.
- The customer on a resource calculation was erased by saving, and "Prepared
  For" on the quotation printed blank. The customer's NAME is stored in
  `positionCode` and the form seeds `customerId` from it, but every lookup
  matched on `customer.id` — so the Customer control had no matching option and
  rendered blank, and the next save wrote that blank back over the stored name.
  Each save therefore destroyed the customer and the next load looked blank
  again. Lookups now match on id or name, a reopened record normalises the
  stored name back to its id, the control falls back to showing the stored name
  when the directory has not loaded or no longer holds that customer, and an
  empty value only overwrites a stored customer when the user cleared the
  control themselves.
- Expense, wallet and vendor lists loaded empty with no error. The pages fetched
  their data in a server component, where no bearer token exists, so the gateway
  returned 401 and the catch turned it into an empty array — indistinguishable
  from having no records. Each list now loads on the client, and a failed load
  reports the failure instead of rendering "no data".
- Resource quotation description bullets dropped every non-ticket government
  line from the PDF and counted End of Service twice; the PDF and the on-screen
  summary now derive the bullets from the same helper.
- Proforma details and edit pages are wrapped in `PageGuard`. They previously
  enforced sign-in but not the proforma permission, so any authenticated user
  could open them directly by URL.
- The Customer dropdown on a resource calculation no longer goes silently
  empty when the customer list fails to load. `getCustomers()` swallowed the
  rejection and returned `undefined`, which SWR reports as a successful fetch
  with no data — so a 401 looked identical to "this company has no customers",
  with no error and no retry. The failure now surfaces under the field.
- Sales, profile (PRMS) and Azure billing calls no longer break on a deploy
  where `NEXT_PUBLIC_SERVER_URL` is unset or carries a trailing slash or a
  legacy `/supabaseservices` suffix. The three constants now normalise and fall
  back the same way `src/lib/axios.js` already did; previously an unset value
  produced the literal URL `undefined/profile/jd`, which axios sends as a
  relative path to the dashboard's own origin.

---

## [1.0.0] — 2026-08-24

First tracked release. Establishes the baseline; changes before this point are
in the git history rather than here.

`package.json` previously read `9.9`, inherited from the Minimal template and
never set to an IOTA version.
