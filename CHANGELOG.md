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
- **Email an NDA review to the IOTA team.** "Email Review to IOTA" in the NDA's
  Actions panel sends the saved review as a formatted email. Each chosen clause
  appears as a review comment showing the highlighted wording, why it matters,
  what IOTA asks for and the proposed amendment. The NDA itself is attached.
  Default To / Cc come from appConfig `notifications/ndaReview`; an Admin or
  Super Admin can change them from the dialog. Every send is recorded in the
  NDA's audit log.
- **Onboarding → automatic vetting → Super Admin approval → offer letter.**
  When an employee submits the onboarding form, a vetting record is created and
  the AML (sanctions/PEP/adverse media) and international passport checks are
  started automatically; results that are still pending are collected every 30
  minutes. The onboarding form now requires a background-check consent
  checkbox. Auto-run can be switched off in appConfig (`vetting/autoRun`), in
  which case the checks are drafted for HR to start by hand. Vetting records
  have an approval status; only a Super Admin can approve or reject one, and not
  while any check is still draft or pending.
- **Offers from approved onboarding submissions.** New Offer has a "Start from
  an onboarded employee" picker listing submissions whose vetting a Super Admin
  approved and that have no offer yet; picking one fills in the employee's
  details. The server refuses an offer for a submission that is not approved or
  already has one.
- **Uploaded offer letters, checked against the offer.** An offer can use the
  IOTA template or an uploaded PDF. The uploaded letter is compared by AI with
  the offer's details (name, role, dates, contract terms, every salary
  component, leave, notice, passport, nationality) and each difference is
  highlighted. On the offer page, signature areas for the employee and each IOTA
  signatory and company-stamp positions are placed directly on the uploaded
  letter. It cannot be sent until it has been checked and has an employee
  signature area. The employee signs the uploaded letter itself, after all IOTA
  signatories have signed.
- **NDA review against the IOTA standard, with exceptional approval.** Every
  uploaded NDA — and any IOTA-template NDA with added or rewritten clauses — is
  checked by the Azure OpenAI deployment against IOTA's NDA standard
  (liability, indemnities, penalties, non-compete, IP, non-solicitation,
  mutuality, definitions, term, governing law for the executing office, audits,
  data, termination, return/destruction, assignment). The review lists each
  problem clause with the quoted wording, why it hurts IOTA, what to ask for and
  suggested replacement text, plus a checklist and an overall risk level.
  - **On upload**: a switch on New NDA (on by default) runs the review as soon
    as the document is uploaded.
  - **Existing NDAs**: an "IOTA review" column in the list and **Review
    existing NDAs**, which checks every unreviewed NDA in turn; each NDA page
    can run or re-run its review.
  - **Gate**: an NDA that needs review cannot be submitted for signing until it
    is reviewed and either clear, or carries an exception approved by an Admin
    / Super Admin with a written reason. Requesting an exception emails the
    Admins and Super Admins; an admin cannot approve their own request (a Super
    Admin can). Uploading a new document or changing the wording clears the
    review, so the revised NDA is checked again. Every review and decision is
    in the NDA's audit log.
  - The standard is one file in the API (`ndas/ndaStandard.ts`) — contract
    policy: legal sign-off before changing it.
  *(Backend: `ndas/ndaReview.ts`, `ndas/ndaReviewGate.ts`,
  `ndas/ndaStandard.ts`, gate in `ndas/ndas.ts`; migration
  `supabase/sql/20261011_nda_ai_review.sql`.)*
- **Talent: resume IDs, search, candidates per requirement, and matching.**
  - Every resume has a permanent **resume ID** (`IOTA-R-00042`), shown in the
    library and on the resume page, and printed on the formatted PDF so a
    client can quote it. Existing resumes are numbered in the order they were
    added.
  - **Search** is ranked full-text search across skills, roles, employers,
    education and certifications, with English stemming ("consultants" finds
    "consultant"). The search box takes `"exact phrase"`, `OR`, `-exclude`
    (applied to the whole search) and resume IDs. **Filters**: skills (has
    all / has any), specialization, years from–to, certification, employer,
    attached requirement, date added, archived; sort by best match, newest
    or experience; paged results with a total count.
  - A requirement's **client is chosen from IOTA's customer list**; the name
    comes from the customer record.
  - **Candidates per requirement**: attach any number of resumes and track
    each through shortlisted → submitted to client → interview → selected /
    rejected / withdrawn. Add them from the library, attach suggested matches,
    or upload resumes straight into the requirement. A resume's page lists the
    requirements it is attached to and can attach it to another.
  - **Matching**: finds resumes in the library that fit a requirement. The
    database first narrows the library by the JD's skills and the role, then
    the AI scores the closest 40 from 0–100 with reasons and gaps; the top
    matches are kept on the requirement. It runs automatically when a
    requirement is created and on demand (**Match again**). Matches are
    suggestions — nothing is attached until a recruiter attaches it.
  *(Backend: `talent/candidates.ts`, search in `talent/resumes.ts`, customers
  in `talent/requirements.ts`; migration
  `supabase/sql/20261010_talent_search_and_matching.sql`.)*
- **Talent menu** (Management → Talent), with two pages that are granted
  per member: by default only super-admins see them; grant others in Access
  Control. The API applies the same rule.
  - **Requirements.** Log a client requirement — a full JD or a one-liner —
    with client, location, experience, positions and priority. A one-liner
    gets a complete job description written straight away, by the same
    generator as Profile → Job Descriptions; a full JD is kept as sent and can
    be rewritten in IOTA's format. The JD is editable. **Create job posting**
    hands it to Job, where the existing approval → careers-site (Webflow) sync
    publishes it. **Post on LinkedIn** opens LinkedIn's composer with the post
    written (and copied), and the published post's link is saved against the
    requirement. LinkedIn has no open API for company job posts, so the post
    itself is made by a person.
  - **Resume Formatting.** Upload candidates' own resumes (PDF or Word, up to
    10 MB, several at once). Each is restructured into IOTA's format —
    profile, skills, experience, education, certifications, languages — with
    the **first name only** and **no email, phone, address or profile links**:
    the AI is told to leave them out, and every saved field is scrubbed again
    on the server, including the candidate's surname wherever it appears. The
    recruiter can correct any section before use. **Download PDF** produces
    the IOTA-branded resume; **Share link** stores a copy in Azure Blob Storage
    and returns a link that expires after 1–30 days and can be revoked at any
    time. All resumes stay in a searchable library (skills, roles, employers,
    certifications, specialization, minimum years), can be tied to a
    requirement, and keep the original upload privately (opened through a
    ten-minute link).
  *(Backend: new `talent` service; migration
  `supabase/sql/20261009_talent.sql`; new secret
  `TALENT_STORAGE_CONNECTION_STRING`; new dependency `@azure/storage-blob`.)*
- **Super-admins can enforce or relax the authenticator (TOTP) per user.**
  Access Control → select a user → **TOTP enforced / TOTP relaxed** switch.
  Relaxed: the user signs in with Microsoft only — no code, no periodic
  re-verification — and the API accepts their session without the second
  factor. Enforced (the default for everyone): as before. Only the
  requirement changes; the user's registered authenticator is kept either
  way, so re-enforcing asks for a code from the same app, not a new
  registration. A user who never registered one is asked to set it up at
  their next sign-in. Needs the migration
  `supabase/sql/20261008_user_totp_required.sql`; until it runs everyone stays
  enforced and the switch reports the missing column. *(Backend:
  `auth/auth.ts` gate 4, `POST /totp/requirement`, `totpRequired` in
  `/totp/status`.)*
- **MFA screens show whose account it is.** The "Verify Your Identity" prompt,
  the setup-required prompt and the sign-in code page all show the signed-in
  name and email with a **Not you? Sign out** button, so someone can leave and
  sign in with another account. A locked account shows the same.
- **AI suggestions for the second language of an invoice line.** Now that every
  line must be in English and Arabic, the invoice form proposes the missing
  language itself: leaving a field fills its empty counterpart (English →
  Arabic, or Arabic → English), "Suggest Arabic" on a line rewrites that line's
  Arabic from the current English, and "Fill missing translations" completes
  every line at once. A suggestion lands in the normal form field, marked
  "AI suggestion — review and edit before saving" until someone edits it, and
  nothing is stored until the invoice is saved. Text a person typed is never
  overwritten by the automatic fill. Product names, codes, numbers and dates
  are kept as written. Uses the Azure OpenAI deployment the profile service
  already uses.
  *(Backend: `supabase/invoice-translate.ts`, `POST /invoice-lines/translate` —
  deploy with the dashboard.)*
- **Careers intake from iotatechnologies.ai.** Applications submitted on the
  website now land in the dashboard. Two doors, both feeding the same pipeline:
  the Webflow form on each job page, delivered through a Webflow
  form-submission webhook that the dashboard registers itself under Job >
  Careers Intake; or a custom form posting to the careers API. The webhook URL
  carries a long random secret, each call is checked against Webflow's HMAC
  signature when a signing secret is set, must be fresh (5 minutes), must come
  from IOTA's site, and is accepted once per event. The API door is protected by
  Cloudflare Turnstile, a honeypot field and throttling per address and per
  candidate. Every text field is bounded and stripped of markup. Each résumé is
  checked for type by its bytes (PDF or Word .docx only), size, PDF scripting
  and launch actions, Word macros, embedded objects and remote templates, and
  decompression bombs; a configurable antivirus engine (self-hosted ClamAV or
  VirusTotal) then scans it. Files that fail are not stored; the application is
  still recorded with the reason. Stored résumés are private and downloaded
  through 10-minute signed links. The job's Candidates tab now lists the real
  applications with source, scan result, status and download. Requires
  deploying `../IOTAApiServer` (its migration runs automatically) and
  `sql/add_careers_intake_nav_permission.sql`.
- **Employee Onboarding** (Management > HR > Employee Onboarding): a secure,
  one-time, OTP-verified form sent only to employees who already exist in
  HR > Employees, on the same pattern as Candidate Intake. The employee
  confirms pre-filled details and provides contact and emergency contact,
  identity documents, **family and dependant details** (spouse, dependants,
  insurance inclusion), bank/IBAN and GOSI, insurance preferences and a
  declaration; mandatory fields are enforced per step and again on the server.
  HR reviews the submission and **applies** it to the employee record in one
  click, so payroll, GOSI, insurance and billing run on confirmed data. The
  public form lives at `aspirants.iotatechnologies.io/onboarding/<link>`.
  Requires deploying `../IOTAApiServer` (new `employeeonboarding` service) and
  running `sql/create_employee_onboarding_tables.sql`.
- **Employee Billing** (Management > HR > Employee Billing): billing contracts
  per customer of type *single employee* or *managed services* (several
  employees on one invoice), each employee line carrying a costed rate card
  (salary, GOSI employer share by nationality, medical insurance by family
  status, iqama, tickets, Saudization, end-of-service accrual, admin fees, an
  optional Zakat provision and IOTA charges) computed with the same engine as
  the resource-calculation quotation and configurable in `appConfig`
  (`employeeBilling` namespace). A monthly run previews and raises one invoice
  per contract per period (pro-rated for mid-month starts and ends) straight
  into the Invoice module as *pending*, so the existing internal approval
  (super-admin, TOTP, OneDrive, ZATCA, AR ledger) is reused unchanged. After
  approval a **Collections** board drives each invoice through send to the
  customer's department contact with the PDF → customer approved / queried →
  receipt requested from Finance → paid, with validated transitions, history,
  automatic follow-up dates, and counts of what is pending and what needs
  chasing. Invoices can be downloaded as PDF at any stage. Requires deploying
  `../IOTAApiServer` (new `employeebilling` service) and running
  `sql/create_employee_billing_tables.sql`, which also seeds the two invoice
  types *Employee Contract Invoice* and *Managed Services Invoice*.
- Employee Onboarding links can be sent to **new joiners who are not in
  HR > Employees yet**, not only to existing employees. HR enters the name, the
  joiner's **personal email**, and optionally designation, department and
  expected joining date; the link and the one-time code go to that personal
  address. When the submission is accepted HR supplies the employee code and
  joining date and the **employee record is created** from the form, with the
  personal email kept on it and the work email left blank until the company
  mailbox exists. For an existing employee the link now defaults to the
  personal email on record and the address can be changed before sending.
  Requires `sql/alter_employee_onboarding_for_new_joiners.sql`.
- The onboarding form can be **saved as a draft**. Progress is stored on the
  link each time the person moves between steps and whenever they press "Save
  draft", so they can close the page and return with the same link; the draft
  is handed back only after the one-time code is verified again and is cleared
  on submission. A session that times out mid-form now asks for a new code and
  keeps everything on screen instead of losing it, and HR sees when a draft was
  last saved on the Links tab. Requires
  `sql/add_draft_to_employee_onboarding_tokens.sql`.
- **Onboarding audit trail for HR.** Every event on an onboarding link is
  recorded with the IP address, the approximate location derived from it, and
  the browser, operating system and device: each time the link is opened, each
  code request, each login (code verified) and failed attempt, every draft save
  (automatic or manual, and at which step), each time a saved draft is
  re-opened, and the final submission. The submission page shows the trail with
  totals — logins, failed logins, drafts saved, re-opens, distinct IP addresses
  and devices — and the Links tab has a "View activity" action that shows the
  same for links that have not been submitted yet. Requires
  `sql/add_audit_context_to_employee_onboarding.sql`.
- **Customer contacts on billing contracts.** A contract can name several
  people on the customer's side, each with a role (approver, delegate, finance,
  cc). Each contact is either emailed or marked **Do Not Disturb**, and an
  approver can have a **delegate** who acts for them, optionally until a date.
  When an invoice is sent, Do Not Disturb contacts are left out and an active
  delegate takes the approver's place; the send dialog shows who is being
  skipped and why. Contracts saved with the single contact fields keep working.
- **Contracts without contacts, for customers who use their own system.** A
  contract's submission channel can be email, the customer's portal (Oracle
  Cloud, SAP Ariba, Coupa or other, with the portal address and IOTA's supplier
  number) or manual. Portal contracts are never emailed: after internal
  approval you download the PDF, submit it on the customer's system and record
  the reference it returned, which then shows on the Collections board.
  Requires `sql/add_contacts_and_channel_to_employee_billing.sql`.
- **Employee invoices print in English and Arabic.** Each generated line carries
  the employee's Arabic name from their record and an Arabic description with
  the billing month.
- Billing contracts record the commercial trail that precedes billing: the
  approved proposal (resource calculation), SOW number, the customer's
  requisition number (printed on every invoice as the reference), SOW received
  and signed dates, the **signed SOW document** (uploaded to storage), contract
  term (6/12/24 months), renewal date and the contract it renews. Contract
  status follows the same flow (proposal sent → customer approved → SOW received
  → signed → active → renewal due → ended); only active contracts are billed.
  Adding an employee whose onboarding is not complete shows a warning. Requires
  `sql/add_sow_to_employee_billing_contracts.sql` after the billing tables.
- Download an Employee Vetting report as an IOTA-branded PDF, in two copies.
  The **client copy** is what a customer asking for vetting details receives:
  each check with its scope, completion date and outcome, identifiers masked
  (dates of birth reduced to the year), no raw IDfy payloads, and a
  confidentiality notice limiting use to employment suitability. The **internal
  copy** carries unmasked identifiers and IDfy's payloads verbatim as evidence,
  watermarked "do not share". The PDF renderer is loaded only when a report is
  requested, so it stays out of the page bundle.
- Vettings can be saved as a draft: the record is stored and nothing is sent to
  IDfy, so partial details survive and IDfy is billed only once the record is
  complete. A draft is submitted from its details page; only checks still in
  draft are dispatched, so submitting twice cannot re-send — or re-charge for —
  a check that already went out, and the backend refuses an incomplete draft
  naming the missing fields rather than paying for a rejected submission.
- Employment Verification in Employee Vetting: confirms the candidate actually
  held a role — organisation, employee ID, designation, joining and last working
  dates, salary and the supervisor to contact — rather than only confirming the
  employer exists. This required integrating IDfy's Background Verification
  product, which is a separate account on a separate host
  (`https://api.dc.idfy.com`, `apikey` header plus a `company_id`) and is
  profile-shaped rather than task-shaped; the two EPFO/ESIC checks already in
  the catalogue verify the EMPLOYER against a government register and have been
  relabelled to say so. Requires running `sql/add_idfy_bgv_credentials.sql` and
  filling in the BGV credentials; the EVE checks keep working without them.
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

### Security
- **The API now requires a signed-in user on every endpoint that is not public
  by design.** 191 endpoints that previously answered anyone who knew the URL —
  payroll, wallet top-ups, offers, NDAs, employee requests, insurance, reports,
  OneDrive, ZATCA onboarding, reconciliation, commissions, enterprise-app users
  and more — are authenticated at the gateway. The 32 that stay public are the
  candidate-intake and onboarding forms, NDA and offer signing links, the
  public document and policy viewers, the careers application form, inbound
  webhooks (which verify their own signatures) and the pre-MFA authenticator
  calls. Three scheduled-job endpoints are no longer reachable from outside.
  Requires deploying `../IOTAApiServer` together with this build.
- Authenticator setup and status now require the caller's own sign-in.
  Previously `POST /totp/setup` took any user id with no token, replaced that
  person's authenticator secret and returned the new one.
- Role is taken from the verified sign-in, not from the request. Editing and
  deleting expenses, editing invoices and switching Record Edit Mode used the
  `roleId` sent by the browser, so any signed-in user could claim to be a
  super-admin. Approving or rejecting an invoice (super-admin), marking one
  paid (admin and above) and deleting one (super-admin) are now enforced by the
  API as well as the screen.
- The backend no longer reads credentials from a committed `.env` file; they
  come from Encore secrets. The file, the ZATCA key files and result files are
  removed from the repository and ignored. **The exposed values still have to
  be rotated** — removing the files does not make them safe.
- The OneDrive proxies and the bank-statement upload forward the user's token
  to the API; they previously called it anonymously.

### Changed
- **Payslip.** The year-to-date column is gone; the payslip shows the period
  only. The employee details panel is one typeface throughout (the Employee
  ID, IBAN, days paid and joining date were in a different, monospaced face).
  Deductions are now itemised: each one is printed on its own row with its
  reason, where a lump sum used to print as a single "Other Deductions" line.
- **Deductions are captured with their details.** Adjust on a payroll run now
  takes a list of deductions, each with a reason (common ones are suggested)
  and an amount, and shows the resulting net pay including GOSI and loss of
  pay. A deduction without a reason cannot be saved, on Adjust or when
  generating a run, and deductions larger than the pay are refused. Needs the
  migration `supabase/sql/20261005_payroll_deduction_items.sql`; until it is
  run the deductions still save, as one summarised line.
  *(Backend: `payroll/`, deploy with the dashboard.)*
- **The Payslip button on Finance > Payroll opens a menu** with View and
  Download instead of downloading at once. View shows the payslip on screen,
  with a Download button beside it.
- **Invoice line items are strictly bilingual.** Every line must carry an
  English and an Arabic title, and a description must be given in both
  languages or not at all; text typed in the wrong box (English in the Arabic
  field or the reverse) is refused. The invoice form enforces it on save, and
  the API enforces it again when an invoice is submitted for approval and when
  it is approved, so no path reaches ZATCA or the customer with a line in one
  language. The approval dialog now lists each line in both languages, names
  any incomplete line, and disables Approve until the creator completes it
  (Reject still works). The invoice details page shows the Arabic text under
  the English. The monthly employee-billing run skips a contract whose
  employee has no Arabic name on the HR record and says who. The invoice
  email to the customer lists the lines in both languages (it used to print
  the raw stored line data as one title). Invoices approved before this
  change are untouched.
  *(Backend: `shared/invoice-lines.ts`, `supabase/supabase.ts`,
  `employeebilling/`, `emails/invoiceEmailTemplate.tsx` — deploy with the
  dashboard.)*
- Invoice list rows show the employee-billing collection stage next to the
  status for invoices raised from a billing contract. No other invoice
  behaviour changed; the backend skips the automatic supplier proforma for
  those invoices.
- Employment Verification now collects exactly IDfy's 15 mandatory attributes.
  Their six optional ones (department, resigned, salary, salary type, salary
  currency, reason for leaving) are no longer asked for — they added six inputs
  to an already long form and IDfy accepts the submission without them.
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
- The NDA Actions panel no longer shows up empty for uploaded NDAs stored in
  OneDrive; their download buttons now appear.
- **HR never received form-submission emails.** Candidate Intake and Employee
  Onboarding emailed HR at `hr@iotatechnologies.io` — the wrong domain. Both
  now email the HR and Operations list held in appConfig
  (`notifications / formSubmissions`, seeded with hr@iotatechnologies.ai and
  syeda@iotatechnologies.ai; editable without a deploy, per-form override
  possible). The candidate or employee still receives their thank-you email.
  The HR email now carries only the name, role, form type, date and a
  dashboard link — the person's email address was removed, and none of the
  submitted data is included. *(Backend: `shared/form-notifications.ts`, both
  services and HR email templates; `supabase/sql/20261012_form_submission_notifications.sql`.)*
- **Job → Publish to Webflow** showed only "Request failed with status code
  401". The toast now says which side refused: the dashboard's sign-in (with
  the API's reason) or Webflow itself (with Webflow's message, e.g. a rejected
  API key or site ID). The call also goes through the shared API client like
  the rest of the app.
- **Mirrored IOTA mark.** The mark in `public/logo/logo-full.png` was a mirror
  image of the real one (rounded edge and slant swapped); only the mark is
  flipped back, the word is unchanged. Fixes the formatted resumes, the
  expense PDF, the VAT export and the NDA document, which all use that file.
- **Pages granted in Access Control did not appear for the member until they
  signed in again.** The menu kept its own cached copy of the member's
  permissions, re-checked only when the dashboard first loaded (once per
  session), and the page guard held a second copy fetched at sign-in. The menu
  now uses the same list as the page guard, and that list is refreshed in the
  background every 5 minutes and when the tab regains focus — a grant shows up
  within minutes, without signing the member out. Access Control also warns
  that a member with no saved permissions follows their role's defaults, and
  that saving replaces them with only the boxes ticked.
- **NDA → Download with Stamp & Signatures failed** with "Failed to process
  document for download". Any signature zone whose signatory had not signed
  yet aborted the whole download, and the message hid the reason. Unsigned
  zones are now left blank and named in a notice ("Not signed yet, left
  blank: …"); Finalize still requires every signature and now says who is
  missing. Password-restricted PDFs (exported with "restrict editing") are
  opened instead of refused, and any remaining failure shows its actual
  cause. Finalize, Print and Download used three copies of the same code;
  they now share one (`src/utils/nda-pdf.js`).
- **Signer's name on NDA signatures.** Each embedded signature in the PDF
  carries the signer's name and signing date beneath it, the signature-zone
  previews show the same, and the IOTA and partner signatory lists show the
  signature itself beside each signed name.
- **Sign-in and MFA.** Three faults in the second-factor flow, all made
  visible by the API lock-down:
  - The dashboard was mounted (blurred) behind the "Verify Your Identity"
    prompt, so every page fired its API calls before the code was entered and
    each was rejected — the stream of authorization errors on the MFA screen.
    Nothing renders behind the prompt now until the code is accepted; a
    re-verification later keeps the page mounted so work in progress is kept.
  - Permissions were fetched at sign-in, before MFA, from endpoints that
    require a cleared session; the empty result then made every page a 403 for
    anyone who is not a super-admin. They are fetched once MFA clears, before
    the dashboard renders.
  - When the authenticator status check failed, the login page started
    authenticator **setup** instead, which replaces the secret the user already
    holds — their existing codes then failed and the account locked after
    three attempts. Both the login page and the in-dashboard guard now show
    the error with Try Again / Sign out and never re-enrol on their own. The
    API also refuses to replace an existing authenticator from a session that
    has not cleared MFA, and refuses setup on a locked account.
  *(Backend: `supabase/supabase.ts` — `/totp/setup`; `/totp/unlock` and
  `/totp/reset` now check for super-admin as their comments always claimed.)*
- **"Connect Microsoft to load users" / "Your Microsoft sign-in token is
  missing" on the Users list, Expense By and every other people picker.** The
  directory was read from the browser with the Microsoft token Supabase hands
  over at sign-in. That token is issued once, kept in the browser and expires
  after about an hour with nothing renewing it, so the pickers went blank
  until the next sign-in. The API now reads the directory with the app's own
  credentials (`GET /microsoft/users`, cached five minutes); the browser token
  is only a fallback. If Entra refuses, the message names the missing
  application permission (`User.Read.All`). *(Backend:
  `profile/microsoft-users.ts`.)*
- **"single sign-on required" after a Microsoft sign-in.** The API decided
  whether a session came through SSO from `app_metadata.provider`, which
  Supabase sets to the *first* identity an account ever had. A user whose
  account was invited or created by email before their first Microsoft sign-in
  carries `email` there for life and was turned away on every attempt. The
  gate now reads the token's `amr` claim — how *this* session was
  authenticated — and accepts an OAuth/SAML step; email/password and
  magic-link sessions are still refused. *(Backend: `auth/auth.ts`.)*
- **Delete on HR > Business Visa and HR > Leave** called endpoints that did not
  exist. *(Backend: two new DELETE endpoints.)*
- **Dead links.** Six places sent the user to an address with no page behind
  it (an error page, whatever the role). Each route in `paths.js` was checked
  against the pages that exist: HR > Employees > **View** (a read-only
  employee page now exists; Edit is unchanged); HR > Business Visa > **View**
  (same); the **HR** crumb on every HR page and the HR group in the menu
  (`/dashboard/hr`, now lands on the employee list); the four cards under
  **Financial Reports** on the finance page (AR aging, AP aging, payment
  history, expense by category — the pages were there but not wired to a
  route); the **Journal Entry** quick action (removed — there is no journal),
  **Create Invoice** (went nowhere, now opens the invoice form) and **View
  Reports** (pointed at an undefined route, now opens Reports); and
  HR > Offer Management > **Edit** (removed — an offer has no edit page; it is
  prepared on creation and then approved and signed from its details page).
- An invoice that had been issued with **Issue & Email** could no longer be
  marked as paid. Issuing overwrote the invoice's `approved` status with `sent`,
  and Mark as Paid only accepts an approved invoice. Issuing now leaves the
  status alone, records the issue time, and shows "sent to customer" as the
  collection stage. Issue & Email is available only once the invoice is
  approved (it used to email unapproved drafts too, before ZATCA clearance).
  Invoices already left in `sent` get a way forward from the list: Mark as Paid
  if they had been approved, otherwise Review & Approve.
  *(Backend: `supabase/supabase.ts`, deploy with the dashboard.)*
- Shipping was subtracted from the invoice total instead of added. New and
  edited invoices now total subtotal + VAT − discount + shipping. Invoices
  already saved keep their stored total until they are edited.
- The invoice PDF archived to OneDrive on approval had no line items, customer
  address, PO number or supply date, because it was built from the list row's
  summary. It is now built from the stored invoice, the same way the details
  page and Issue & Email build it.
- The BDM report answered `HTTP 500 internal error`. The backend read deals
  from a `deals` table that does not exist — deals are rows of the `commissions`
  table, which the Commission module and the BDM pages already use. The report
  now reads `commissions`. Report queries that fail now say which table and why
  (PostgREST's message) instead of a bare "an internal error occurred".
  *(Backend: `reports/reports.ts`.)*
- Reports (P&L, Employee P&L, BDM report), the BDM list and profile pages, the
  Commission list, Job details/edit, the Employee Wallet page, Bank Accounts and
  reconciliation, the Integrations tab, and the Finance payments/aging reports
  failed with `HTTP 401 unauthenticated` after the API was locked down. These
  screens fetched from the API on the server (as Next server actions or server
  components) or with a bare `fetch`, so no sign-in token was ever sent. They
  now fetch in the browser with the signed-in user's live token, via a shared
  `apiFetch` helper; the server pages are now thin pages that render a client
  wrapper behind `PageGuard`, matching the rest of the dashboard.
- "Expense By" could show no users about an hour after signing in. The list is
  read from the Microsoft directory with the sign-in token; when that token was
  refreshed, the refresh asked Microsoft for a narrower set of permissions that
  no longer included reading the directory, so the refreshed token was refused.
  The refresh now keeps the same permission. When the list cannot load, the
  field now says why (token missing, permission refused, or the Microsoft error)
  instead of a generic "connect Microsoft".
- Saving a resource calculation failed with "unable to decode request body"
  errors — first for a premium factor sent as text ("2.1"), then for resources
  missing `totalMonthly` and `totalAnnual`. The per-resource records added with
  multi-resource proposals were sent as the editor held them. Each resource is
  now shaped to the API's declared type before sending: every field present,
  numbers as numbers, blanks as empty text, totals filled in. A script,
  `next-js/scripts/check-resource-calculation-payload.js`, verifies the request
  against the backend's interface so this can be checked without a deployment.
- To-do reminders were not being sent. The reminder jobs run on a schedule with
  no signed-in user, and the endpoints they called started requiring one when
  gateway authentication was introduced, so every run was rejected before it
  started. The two-minute reminder dispatch, the 7:00 morning summary and the
  clean-up of finished tasks now run through private endpoints that only the
  scheduler can reach.
- The to-do board and the sales pipeline could fail to load after the move of
  credentials to Encore secrets: one set of request headers was still built
  once when the service started instead of per request.
- Invoices were submitted to ZATCA with no line items. Lines are stored with
  the invoice as a list, but the e-invoice builder read a field that is never
  filled, so every submission carried totals and nothing else. The builder now
  sends each stored line, in English and Arabic where present, for every
  invoice type.
- Submitting the onboarding form as a new joiner failed with "unable to decode
  request body: middleName: invalid type … expected a string". Blank pre-filled
  fields were sent as `null`, which the API rejects for text answers. Blank
  answers are now left out of the request, and the pre-fill no longer contains
  nulls.
- The Cost Center and Expense Type dropdowns on the new-expense form (and on
  the invoice form and the company performance view, which read the same lists)
  came back empty for a signed-in user, with a 401 in the console. These lists
  are fetched through this app's own `/api/*` proxy routes to avoid CORS, and
  those routes forward the caller's bearer token to the API — but the request
  interceptor only attached a token to requests aimed directly at the API host,
  so the proxy forwarded an empty Authorization header and the gateway rejected
  the call. The token now goes on same-origin `/api/*` requests as well.
- Commission and Job pages could fail the same way, for the mirror-image
  reason: `src/actions/commission.js` and `src/actions/jobs.js` called the API
  on the default axios instance, which is only authenticated when some other
  module in that route's bundle happens to have imported `apiHelper` and
  registered its interceptor. Both now use a shared `src/lib/iota-api` client
  that attaches the live token itself, as does employee vetting, which had
  grown a private copy of the same interceptor after being bitten by this once.
- A user who finished Microsoft Authenticator setup was sent to a dashboard on
  which every API call was rejected with "second factor required", with no
  prompt on screen explaining it. Completing setup proves possession of the
  authenticator, but `/totp/verify-setup` never recorded that the second factor
  had been cleared for that session — only `/totp/verify` did — so the gateway
  had nothing on file for a first-time user. Setup now binds the session it was
  completed in, using the identity from the verified token rather than the
  `userId` in the request body.
- The record of "this session cleared the second factor" was kept in the
  browser under the user's email address, while the server keeps it under the
  Supabase session id. Because that browser record outlives a sign-out within
  the same tab, a user who signed out and back in carried it into a session
  that had never been verified: the dashboard rendered normally, no code was
  requested, and every API call came back 401. The browser record is now keyed
  on the same session id the server uses, so the two cannot disagree, and it is
  cleared on sign-out. A session whose id cannot be determined is now asked for
  a code rather than assumed to have passed.
- The VAT summary screen failed every request it made, reporting "Failed to
  fetch AP by date range" and the equivalent for AR, VAT transactions and VAT
  returns. The accounts-receivable, accounts-payable and VAT helpers were the
  only ones written with the browser's `fetch` rather than axios, and the
  Authorization header on IOTA API calls is added by an axios request
  interceptor, which cannot see a `fetch`. All fifteen calls therefore reached
  endpoints that require authentication carrying no credentials at all and were
  rejected at the gateway. They now resolve the live session token the same way
  the interceptor does.
- Some users landed on a dashboard with no menu items at all. The permission
  lookup that decides which nav entries to show also depended on that axios
  interceptor, which is registered as a side effect of loading a module the
  dashboard layout does not import — so on routes whose bundle happened not to
  pull it in, both permission calls were rejected and their empty result was
  indistinguishable from "this user may see nothing", which hid the entire
  menu. The lookup now attaches the token itself instead of depending on which
  modules a route loaded first.
- A vetting form date could read as filled while the form treated it as empty,
  rejecting the submission with an unexplained "complete the required fields".
  `<input type="date">` yields an empty string until day, month AND year are all
  set, so a half-entered date looks complete on screen but submits as blank, and
  browser autofill can set a value without firing the change React listens for.
  Required fields now show the error on the input itself rather than only in a
  sentence, a partly-entered date says so explicitly, and values are re-read on
  blur as well as on change.
- Employee Vetting failed to load with "the request does not have valid
  authentication credentials". The app-wide bearer-token interceptor is
  registered as a side effect of importing `src/utils/apiHelper.js`, and it
  patches the DEFAULT axios instance — but nothing in the vetting route's bundle
  imports that module, so the interceptor never ran there and the calls carried
  no Authorization header at all. The vetting actions now own their axios
  instance and attach the token themselves, rather than depending on another
  module having been imported first.
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
