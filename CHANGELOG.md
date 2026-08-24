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
- Proforma details and edit pages are wrapped in `PageGuard`. They previously
  enforced sign-in but not the proforma permission, so any authenticated user
  could open them directly by URL.

---

## [1.0.0] — 2026-08-24

First tracked release. Establishes the baseline; changes before this point are
in the git history rather than here.

`package.json` previously read `9.9`, inherited from the Minimal template and
never set to an IOTA version.
