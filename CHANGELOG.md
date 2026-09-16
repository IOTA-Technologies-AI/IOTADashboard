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
