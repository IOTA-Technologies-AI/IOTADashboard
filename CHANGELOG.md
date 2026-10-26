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
- **Document Management: a light or dark document ID.** The Stamp card on a
  document's page now chooses the colour of the document ID line (and its
  "Captured in…" note): Dark (green, the default) for a light page, or Light
  for one where page one is dark behind it, such as a cover image. It applies
  to every PDF downloaded or previewed from there, and to a proposal's own
  PDF. Needs the API deployed.
- **Reword clauses of the detailed letter for one offer.** On the new-offer
  form (and on a draft), "Detailed letter wording" lets HR change any numbered
  clause of the detailed (GOSI) letter for that offer only; the one-page offer
  is never changed. The offer page lists every changed clause, with who
  changed it, for approvers. The API refuses wording changes once the offer
  is in approval, and any other edit made during approval now sends it back
  to the manager stage, so the final approval covers what everyone saw.
- **The employee signs the one-page offer and reads the detailed letter.**
  Sending for signing now signs the offer's main letter (the one-page offer)
  and, unless HR unticks it, shows the detailed GOSI letter beside it to read —
  it is not signed. The signing page marks each letter "to sign" or "to read".
  Signature zones are placed on the one-page offer only; previewing the
  detailed letter no longer shows them.
- **Offers can be voided, amended at more stages, and are locked once signed.**
  Admins and Super Admins can void any offer short of fully signed, with a
  reason: it stays listed as Void, its links stop working, the employee
  appears again among onboarded employees for a new offer, and a candidate
  who had already been told about the offer is emailed the reason and that a
  new letter is coming. Amend (back to draft, edit, approve again) now works
  for approved and rejected offers as well as those awaiting the candidate's
  signature. A fully signed offer can be neither voided, amended, edited nor
  deleted, and only drafts, pending and rejected offers can be deleted at all.
  Each onboarded employee can have one live offer, enforced by the database
  (`sql/20261025_offer_void.sql`) — which also replaces the index that stopped
  an employee whose offer was archived from being offered again.
- **Offer salary splits itself.** Entering the Monthly Salary on an offer fills
  Basic (50% of it), Housing (25% of Basic) and Other Allowances (the rest,
  after any transportation allowance). Each part can still be edited.
- **Candidates can sign their offer on their phone.** On a computer, the
  signing page on docs.iotatechnologies.io offers "Sign on my phone": a QR code
  opens the phone signing page, the candidate draws there, and the signature
  comes back to the computer to check before signing — as IOTA signatories
  and NDA partners already could. Starting it needs the candidate's
  emailed-code session, like signing itself.
- **Named people can approve offer letters at the manager stage.** Besides
  managers, anyone on appConfig offers › managerApprovers (initially Mohammed
  Zakiuddin and Jaffar Meeran) can approve or reject an offer waiting for
  manager approval, and is emailed when one arrives. Their approval completes
  the manager step; the offer still goes on to admin approval. The API now
  checks who is approving or rejecting at each stage, instead of trusting the
  page to hide the buttons.
- **Candidates sign on docs.iotatechnologies.io, with a code and a way to ask.**
  The signing link now opens on the documents site, not the dashboard (old
  dashboard links forward there). Before the offer opens, a 6-digit code is
  emailed to the candidate (10 minutes, five tries; the session lasts two
  hours). On the page they can ask a question about their offer: it is emailed
  to the recipients in appConfig (offers › queryRecipients, default
  hr@iotatechnologies.ai) and the offer's creator, and signing waits until
  someone replies from the offer page. Admins can amend an offer still waiting
  for the candidate: it goes back to draft, the link is withdrawn, it is edited
  and approved again, then sent again. The signing link lasts 30 days
  (offers › signingLinkDays). Saved clauses can be tagged by nationality,
  country of work and contract type, and matching ones are suggested on new
  offers; clauses print in the detailed letter only.
- **Offer signing: the employee signs first, on one letter or both.** When
  sending an offer for signature, HR ticks the one-page offer, the detailed
  letter, or both. The employee is emailed first and signs once for every
  letter chosen; IOTA's signatories are then emailed in order. When the last
  IOTA signature is given, each signed letter is filed in Document Management
  on its own document ID, its first page stamped with the classification
  (Confidential) and the ID, and kept in OneDrive; the offer links to them.
  Signatures are drawn into each letter's signature block. Offers already on
  their way under the old order finish the old way.
- **Accounting: the ERP posts to the general ledger by itself (Financial
  Accounting Hub, phase 2).** Within a minute of an invoice being approved or
  paid, an expense approved, an AP bill paid, a payroll run approved or
  processed, a wallet topped up, a bank statement imported, VAT posted or a
  commission completed, the matching journal is in the ledger; an amended,
  unapproved or deleted record is reversed and reposted. Nothing changes in
  those modules. New screens:
  - **ERP Postings**: every event and its journal, with retry and ignore for
    the few that need attention; the tagging queue for revenue and costs
    without a practice; customer default practices; the accounts each posting
    rule uses; expense and invoice type mappings; and a one-time backfill that
    loads everything since 1 January 2025 into its own months.
  - **Reconciliation**: each control account (receivables, payables, employee
    reimbursements, wallets, payroll, VAT, banks, commissions) against the
    ERP, and the ledger P&L bridged to the existing P&L report.
  - **Reimbursements**: what is owed to each employee for out-of-pocket
    expenses, and recording a cash or bank reimbursement.
  - Invoice and expense pages show "Posted to GL" with a link to the journal,
    and let finance set the practice.
  - Periods: a reviewed month of history can be soft-closed without opening
    it, and all history up to a date in one step.
- **Finance → Accounting: the general ledger (Financial Accounting Hub,
  phase 1).** A chart of accounts by class (assets 1000 to statistical 9000)
  with the dimensions each account requires; a book per legal entity (KSA and
  UAE active, India ready for when it bills), all in SAR; practices as revenue
  centres, shared and practice cost centres, engagements, and employees by
  practice. Journals are prepared, submitted, approved and posted with
  segregation of duties (whoever prepares a journal cannot approve it;
  SAR 50,000 and above needs a controller, SAR 500,000 and above also the CFO),
  with an authenticator check to approve, post or reverse. Posted journals are
  numbered without gaps per book and year (JNL-KSA-2026-000001), cannot be
  edited, and are corrected by reversal. Also: opening balances and journal
  lines imported from CSV, monthly periods opened and soft-closed per book,
  exchange rates (USD and AED pegged), a trial balance per book or consolidated
  (by account, practice or cost centre), general-ledger inquiry, and finance
  roles (viewer, accountant, controller, CFO, practice lead, auditor) given in
  Accounting → Access. English and Arabic labels. Invoicing, expenses, payroll,
  VAT and banking are unchanged; their postings arrive in phase 2.
- **One-page bilingual offer letter for signature.** New offers are signed on a
  one-page Employment Offer / عرض وظيفي, laid out like the iHR offer: an
  English | value | Arabic table (candidate, job title, probation, basic,
  housing and transport allowances, total monthly salary, annual vacation,
  medical insurance, contract duration), a signature block (joining date,
  candidate acceptance, IOTA signatory) and bilingual instructions, on the
  IOTA letter template (US Letter, warm paper, the IOTA mark top-left and a
  short centred rule above the company details: three matched lines each in
  English and Arabic — name, address, CR number), with room to sign between
  each name and its signature caption. The
  detailed offer letter is unchanged and kept for GOSI records: preview it
  from New Offer ("Detailed (GOSI)") or download it on the offer page.
  Offers created before this keep the detailed letter for signature, since
  their signature zones were placed on it. Arabic wording needs HR/legal
  sign-off before go-live.
- **Files → Document Management: proposal document IDs and versions.** The
  File menu now has two pages, Business Files (the existing OneDrive browser)
  and Document Management. Every proposal is given a 12-character IOTA
  document ID (e.g. `9XDE-9BFB-3K7L`) when it is first opened after saving;
  the quotation PDF prints the ID and its version, and the file is named after
  them (`9XDE-9BFB-3K7L_v2.pdf`). Downloading the customer copy (or sharing
  the PDF file) sends it: if anything printed has changed since the last
  version, it is saved to OneDrive as the next version; if not, it is that
  same version again. The internal cost-breakdown copy is never stored.
  Document Management lists every document with search by ID, title, client
  or resource, and status filters; a document's page previews any version,
  downloads it, opens it in OneDrive, takes an uploaded revision as the next
  version, and records status (sent, accepted, rejected, archived), notes and
  activity. **Add document** files a document prepared outside the dashboard
  (PDF, Word, Excel, PowerPoint or image): choose its type (proposal,
  statement of work, contract, NDA, invoice, general…), client or Internal,
  person and office; it is given a document ID and kept in OneDrive as v1,
  and each later revision is uploaded as the next version. An uploaded file is
  filed, not marked sent — mark it sent when it goes out. Office files open in
  OneDrive or download; PDFs and images preview on the page.
  **Document IDs record the practice.** Each document belongs to one of IOTA's
  five practices (Data & AI, Cybersecurity, Digital Engineering, Cloud, Infra
  & DevOps, Talent & Managed Services), and its type is chosen from that
  practice's own list. A document has two forms of its ID: a 12-character
  short code shared externally (e.g. `IOVQ-TIYT-QLIY`, with check characters
  that catch a mistyped code) and a 24-digit internal number,
  `4682-572-052747-1-1792665000` — IOTA, office, the client's keypad digits
  (JARIR → 052747; a clash bumps the last digit), practice, and UTC epoch.
  Either one can be searched, or looked up in the ID decoder; offer-letter IDs
  are unchanged. Proposals get a Practice field (default Talent & Managed
  Services), fixed once the ID is issued on save.
  **Document types are configurable.** One list kept in appConfig
  (`documentManagement` / `documentTypes`): Proposal, Quotation, Purchase
  Order, Statement of Work, Agreement / Contract, Change Request, Invoice,
  Report and General Document to start. Super-admins edit it in Document
  Management → Document types: add a type, rename it, tick the practices it
  applies to, or switch it off. A saved type cannot be removed and its code
  is fixed, because its number is written into every document ID issued
  under it (up to 15 types).
  **Classification.** Every document is Public, Internal, Confidential
  (default) or Restricted, chosen on upload and changeable on its page.
  **Stamp.** Page one of the proposal PDF carries the classification, the
  document ID and version, and "Captured in IOTA Document Management System",
  as plain text in IBM Plex Sans Condensed (no box). Each document chooses
  where: the classification and the ID line each go in any corner, top-right
  by default, set on the document's page (Stamp card). An uploaded PDF gets
  the same stamp on its first page whenever it is downloaded or previewed; the original in OneDrive
  is untouched, and the stamp always shows the current classification. Word,
  Excel and PowerPoint files are handed out unstamped.
  Needs `sql/20261022_document_management.sql` in the API repo, and the API
  deployed.
- **NDAs: take a partner's revised document against the one IOTA reviewed.**
  When a partner answers IOTA's review with a new document, choose "Partner
  sent a revised version" on the NDA, instead of creating a new NDA. The
  revised file becomes the next version of the same NDA. The previous file
  and its review are kept, in OneDrive as `…_Rev2`, `…_Rev3`. The AI then
  compares the two versions and shows:
  - each risk IOTA raised: resolved, partly resolved or not resolved, judged
    against what IOTA asked for, with the revised wording quoted;
  - every clause the partner added, removed or reworded, with its risk to
    IOTA. Changes IOTA didn't ask for are flagged "Not requested by IOTA",
    and fixes that overreach are caught too.

  The revised document is also reviewed against the IOTA standard as usual.
  The NDA stays "Under Review" while any raised risk is unresolved or a
  change adds risk. Earlier versions can be downloaded from the Versions tab.
  Draft NDAs only. Needs `20261019_nda_revisions.sql`.
- **NDAs: choose how the NDA is signed.** When building an NDA you pick one
  of three modes: IOTA and partner both sign in the dashboard; IOTA signs in
  the dashboard and the partner signs in ink; or both sign in ink. An all-ink
  NDA skips dashboard signing and is labelled "Awaiting Ink Signatures". An
  ink-signed NDA is completed by uploading the signed copy, which is now
  required because it is the copy stored in OneDrive. Needs
  `20261018_nda_signatories_and_signing_modes.sql`.
- **NDAs: a follow-up To-Do for every unfinished NDA.** Once an NDA is out
  for signature, its creator gets a To-Do saying what is needed next: chase
  IOTA or partner signatures, get the ink-signed copy back and upload it, or
  finalize and store the executed NDA in OneDrive. The To-Do board's morning
  reminder emails the creator about it every day. The task updates as the
  NDA moves on, comes back if it is closed early, and moves to Done once the
  NDA is fully executed and stored in OneDrive. A daily job adds tasks for
  NDAs that were already open.
- **Super admins can send an IOTA signature back for re-signing.** On an NDA
  or offer letter, each IOTA signatory's signature has a "Send back" action.
  It clears that signature and emails the signatory the reason with a link to
  sign again. This works until the partner or employee has signed. If the
  document had already gone to them, it returns to IOTA signing, their link
  stops working, and a fresh link is emailed once IOTA's signatures are
  complete again. Signatures that look blank or incomplete are flagged in red
  in the signatory lists, and every send-back is recorded in the audit log.
- **A more natural signing pad.** Strokes now thin and thicken with drawing
  speed, or with pen pressure on a stylus, and fast strokes stay smooth. The
  pad offers blue or black ink and an Undo for the last stroke, and draws at
  twice the resolution so signatures stay crisp in the PDF. The saved image
  is cropped to the signature, without the guide line or hint text that used
  to be baked into it, so it fills its signature area. Changing the pad after
  pressing Apply withdraws the applied signature, so what is submitted is
  always what is on the pad.
- **Sign on your phone.** The signing pad on NDAs and offer letters, for IOTA
  signatories, partners and employees, has a "Use my phone" tab. Scan the QR
  code, sign with your finger, and the signature appears back on the
  computer, where you check it and submit as usual. The phone only delivers
  the image; it cannot sign anything. Each code works once, expires after 10
  minutes, and is replaced when a new one is shown. The image is erased from
  the server as soon as the computer collects it. Needs
  `20261018_signature_handoff.sql`.
- **Click to start / stop pen.** For a mouse or trackpad, a switch under the
  pad lets the pen follow the pointer without holding the button down. Click
  to put it down, click again (or press Esc, or leave the pad) to lift it.
  The setting is remembered on that browser.
- **Twelve signature styles in Type mode.** Your name is previewed in each
  style to pick from, with an optional flourish underline.
- **Signature IDs and a Signature Log.** Each signature now gets an ID when it
  is recorded. On the document it is printed in a rounded bracket frame
  around the signature, under "IOTA eSigned by:". NDA and offer pages in the
  dashboard have a Signature Log that lists every signature with its ID, how
  it was captured (drawn, typed or on a phone), the signer's IP, and a
  SHA-256 of the image. The log flags any image that no longer matches its
  hash. The ID is also written into the audit entry for the signing.
  Signatures recorded before this change are shown unframed.
- **One-time codes: six boxes and a "Paste code" button.** Every code screen
  (authenticator sign-in and re-verify, authenticator setup, invoice approval,
  NDA signing, candidate intake, employee onboarding) now takes the code in six
  boxes. "Paste code" — or Ctrl/⌘+V into any box — fills them from the
  clipboard, accepting "123 456" or a whole message, and verifies straight
  away. A wrong code shakes the boxes.
- **Sign-in page: a door ajar onto a night sky** replaces the dashboard
  illustration. It swings open on load and stays still for anyone who has
  reduced motion turned on.
- **Offer letters: IOTA signatories from a list, saved clauses, and an Addendum.**
  - IOTA signatories are chosen from a dropdown of Microsoft users on an
    allow-list in appConfig (offers › iotaSignatories) — Abdul Raheem Syed for
    now; add a person by adding their email or name there. The API refuses
    anyone not on the list, and takes names and titles from Microsoft.
  - Clauses can be saved for reuse and added from a saved list, the ones for
    the offer's client first (e.g. American Express overtime). Saved clauses
    live in appConfig (offers › clauseLibrary).
  - An offer's own clauses are printed on an **Addendum** page (A.1, A.2…)
    after section 7 and before the Acceptance page, so the signatures cover
    them; with no clauses there is no Addendum page.
  - Needs `sql/20261017_offer_settings.sql` (API repo).
- **A "sent" / "signed" moment wherever something leaves IOTA or is completed.**
  Adapted from Docusign's "Sending an envelope" flow on Mobbin and rebuilt in
  IOTA's style: the letter prepares, paper planes take off along drawn trails
  (or a signature draws itself), and a clear "Sent" / "Signed" state lands with
  what happens next. It replaces the plain toast at: offers (sent for IOTA
  signatures, fully approved, sent to the employee, filed), NDAs (sent for
  signatures, sent to the partner, finalized, review emailed), lead replies,
  invoices (issued and emailed, employee-billing invoices sent), proformas,
  payslips, job publishing and job approval requests, candidate intake and
  onboarding links, HR self-service requests and salary increments, and the
  public pages where an employee signs an offer, a partner signs an NDA, or a
  candidate or new hire submits a form. People with reduced motion turned on
  see the final state only. One component, `celebrate()`, mounted once in the
  root layout.
- **One offer letter for every employee: the IOTA Employee Offer Letter
  (October 2026), in IBM Plex Sans Condensed.** The letter that is previewed,
  shown to the employee, signed and filed is now the same PDF — cover letter,
  sections 1–7, acceptance page and back cover, as in the approved template.
  The offer form has an **Offer Letter Terms** section for what differs per
  employee (title, grade, duties, reporting line, insurance class, dependants,
  air ticket cap, training cost recovery, validity date, government ID, and
  whether the client is SAMA-regulated); customer-only clauses appear only when
  the offer has a client. Probation is entered in days. Print on the offer page
  now prints this offer's letter (it printed a blank template). Signature zones
  are placed on the offer page after approval, on the letter's real pages.
  - Needs `sql/20261017_offer_letter_terms.sql` (API repo).
- **Offer letters get an IOTA document ID instead of a typed contract number.**
  A 12-character, reversible ID (shown as 9XDE-9BFB-3K7L) is issued when the
  offer is saved. It encodes the company, country, document type (Employee
  Offer Letter), the client, the candidate and the minute it was issued. The
  offer form asks for the **Client** (an ERP customer, or Internal — IOTA
  office) instead of a contract number. **Look up a document ID** on Offer
  Management reads any ID back as text and opens its offer. Existing offers
  keep their numbers.
  - Needs `sql/20261017_document_ids.sql` (API repo) **before** the API deploy —
    creating an offer calls the new registry functions.
- **Nightly retention and LinkedIn sync run in production only.** Staging
  shares the database and settings, so both used to run them. "Run now" and
  "Sync now" still work in every environment.
- **Consent registers: date range, filter chips and expandable rows.** Filter
  by when consent was given (last 7 / 30 days, 3 months, this year, or a
  custom range); narrow leads by purpose and applicants by how consent was
  given (ticked, careers form, confirmed by staff, not recorded). Open a row
  to see the exact words agreed to, the privacy notice, where it was given,
  and who withdrew it and why. Export CSV follows the same filters and now
  includes who withdrew and the withdrawal note.
- **Retention never deletes on the spot: a review queue and an undo window.**
  - Each rule has an action: **Only list**, **Flag for review** (HR keeps or
    deletes each record) or **Delete**. Defaults: withdrawals and records with
    no personal decision are deleted; a person's enquiry, application or
    intake form is flagged.
  - Everything due is **queued** first. A deletion waits out an **undo
    window** (7 days by default, 1–30) and anyone can **Keep** it in that
    time; a record that stops being due meanwhile (a lead converts, an
    applicant is hired) is dropped from the queue, not deleted.
  - Integrations → Consents → Retention shows the queue — Needs review,
    Waiting for deletion (with the date), Kept (with Release).
  - Needs `sql/20261017_retention_queue.sql` (API repo) after
    `20261014_privacy_retention.sql`.
- **Consents and Retention, reworked after comparing shipped products on Mobbin.**
  - Website visitors: a **choices-per-day chart** (accepted vs essential), with
    a table view of the same numbers.
  - Every consent register: **Export CSV** of all records matching the
    filters, including the exact consent wording — for access requests and
    audits.
  - Retention: open a rule to **see who it would delete** right under it;
    turning retention on or running it now shows the record count and the
    first run's date and asks you to **type DELETE**; people who can't edit
    see a plain "How long is personal data kept?" summary instead of a greyed
    form.
- **Jobs post to the website in the careers house format.**
  - **Job ID** (e.g. IOTA-ENG-006) is required in the job form, unique, and
    sent to the posting's Job ID; a job without one is not published.
  - **Location** is a text field defaulting to "Riyadh, Saudi Arabia" (it was
    a country picker that could only send "Saudi Arabia").
  - **Draft with AI** writes the description and qualifications in the
    site's format (intro, What you'll do, What we offer / What we're looking
    for, Nice to have) with IOTA's Azure OpenAI deployment. Left empty, the
    description is drafted on save; approval still comes first.
  - A new **Qualifications** editor; the posting now carries responsibilities,
    benefits and qualities in their own sections.
  - Needs the API deploy (applies `webflow/migrations/8_job_code_nice_to_have.up.sql`).
- **Consent wording, data retention, and consent on each person's page.**
  - Every consent is worded once (API `shared/consent-texts.ts`), shown
    word for word by the candidate intake form and the Apply dialog, and
    recorded with the version the person saw. Integrations → Consents →
    **Wording** shows each consent and its versions.
  - **Retention** (Integrations → Consents → Retention): enquiries 24 months
    after last contact, applicants not hired 12 months after the decision,
    candidate intake 6 months if they did not join, 30 days after consent is
    withdrawn, website non-leads 90 days. It shows what is due now and within
    30 days and who would be deleted, and logs every deletion without
    personal data. A proof of each consent (email hashed) is kept 5 years.
    **Off until a Super Admin turns it on**; Super Admins can change the
    periods. Converted leads and hired applicants are never deleted by it.
  - A lead, a job application, a candidate intake and an onboarding form
    each show the person's consent, with the exact wording, and admins can
    withdraw it there.
  - Needs `sql/20261014_privacy_retention.sql` (API repo) after
    `20261014_consent_capture.sql`, and the API deploy (applies
    `webflow/migrations/7_application_consent_text.up.sql`).
- **Consent captured everywhere IOTA takes in personal data.**
  - The candidate intake form asks for consent to the privacy notice before
    it can be submitted, and, when spouse or dependant details are given, a
    confirmation that the candidate may share them. Both are recorded with
    the notice version.
  - Every job application records its consent: ticked by the applicant, from
    the website careers form, or confirmed by the staff member who adds it in
    the dashboard (the Apply dialog now asks for that confirmation).
  - Replies to leads carry a "Stop emails from IOTA" link (with one-click
    unsubscribe headers) and the privacy notice link. Unsubscribing withdraws
    the consent, and the Leads inbox won't send to anyone who has withdrawn.
  - Integrations → Consents gains **Candidates** and **New hires** tabs; Job
    applicants now covers every application, flagging those with no consent
    recorded. Admins can mark any of them withdrawn.
  - Needs `sql/20261014_consent_capture.sql` (API repo), the API deploy (it
    applies `webflow/migrations/6_application_consent.up.sql`), and the
    Encore secret `UNSUBSCRIBE_SECRET`.
- **Integrations → Consents: every consent IOTA holds, on one page.**
  *Website visitors* shows the cookie-banner choices from iotatechnologies.ai
  and .io, as logged by the iota-consent Azure Function App: a month at a time,
  by site and day, with the latest choices. It is anonymous: no IP or
  identity. *Leads (PDPL)* and *Job applicants* list the consent recorded with
  each enquiry, newsletter sign-up and careers application (basis, privacy
  notice version, where it was given), searchable by name or email. Admins
  can mark a consent withdrawn when someone asks; it is kept in the lead's
  history.
  - Needs the new `consents` API service and the Encore secret
    `CONSENT_TABLE_SAS_URL` (a read-only SAS URL for the `consents` table in
    the iotalogostorage account).
- **Integrations → LinkedIn: the IOTA company page's activity in the dashboard.**
  An admin connects the page once by signing in with a LinkedIn account that
  administers it (read-only access). Every night the API copies the follower
  count and 30-day gain, the page's daily impressions, clicks, reactions,
  comments and shares, and the recent posts with their own figures; "Sync
  now" does it on demand. The page lists the steps needed on LinkedIn's side
  (a developer app with the Community Management API, the redirect URL, the
  two secrets) until the app is set up.
  - Needs `sql/20261014_linkedin.sql`, the new `linkedin` API service, and the
    Encore secrets `LINKEDIN_CLIENT_ID` and `LINKEDIN_CLIENT_SECRET`.
- **Sales → Leads: website enquiries, newsletter sign-ups and job applications
  in one inbox.** Webflow form submissions arrive through one signed webhook
  and are routed by form element (the same on every domain — not by name, which
  the contact and careers forms share). Each lead keeps its PDPL consent basis
  (enquiry, marketing consent or application), the privacy notice version, the
  raw submission and a history. An enquiry converts into the Sales Activity
  Ledger; careers leads stay with HR (they still reach job applications as
  before). Submissions that cannot become a lead wait under "Needs attention"
  instead of being dropped. Admins register the webhook, map the forms and set
  the notice version under Leads → Settings.
  - Needs `sql/20261012_leads.sql` (API repo) and the new `leads` API service.
- **Reply to website enquiries from the home page.** Leads nobody has picked
  up yet appear at the top of the dashboard and in the notifications bell;
  "Reply" opens the standard reply for that kind of form (enquiry, application
  or newsletter), filled in with the person's name and the sender's, to edit
  and send. It goes from engagements@iotatechnologies.ai, signed by the
  Engagement Manager, with the enquiry quoted; answers go back to that mailbox,
  the sender gets a copy, and the lead moves to Contacted. The From address,
  reply-to and signature are in appConfig (leads › replySender); admins edit
  the templates under Leads → Settings.
- **Sentry opens Issues tickets automatically.** A new Sentry issue at error or
  fatal level opens a ticket, with the latest event's stack trace, and emails
  the team (once per Sentry issue). Resolving it in Sentry marks the ticket
  fixed. The webhook is `POST /webhook/sentry`, signature-checked with the
  `SENTRY_CLIENT_SECRET` secret. It can be switched off, or its levels
  changed, in appConfig `integrations/sentry`.
- **Report an issue.** A button on every dashboard page files a ticket with:
  - the user's description, steps and severity;
  - screenshots taken on request: "Capture screen" sets the form aside so the
    user can go to the screen with the problem, reproduce it and capture it
    (up to three, each retakeable), keeping the draft across pages; images can
    also be pasted or uploaded;
  - the browser console, recent API calls with their Encore trace ids, and
    pages visited;
  - the backend errors behind the failed calls and the matching Sentry events.

  Passwords, tokens and codes are removed. The new Issues page lists tickets
  (users see their own, admins see all) with triage, links to each trace in
  Encore Cloud, and "Copy for developer", a complete Markdown brief.
  - Every API service now records the errors it throws (`apiErrorEvents`,
    kept 30 days).
  - Needs `supabase/sql/20261016_issue_reports.sql`. The Sentry lookup needs
    the `SENTRY_AUTH_TOKEN` secret.
- **A home dashboard built on real data.** Every section shows only to users
  with access to that module, and all money is in SAR:
  - **Finance:** billed and collected this year (compared with the same point
    last year), outstanding receivables and payables, expenses, a monthly
    billing chart against last year, recent invoices and top customers.
  - **Sales:** open and probability-weighted pipeline, deals by stage, and the
    top BDMs by gross profit.
  - **HR & compliance:** headcount, iqama, passport, visa and Emirates ID
    documents expiring within 60 days, and onboarding and vetting queues.
  - **Waiting for you:** NDAs and offers to sign, offers to approve, NDA
    exceptions and vetting decisions.
  It replaces the template's typed-in figures and sample lists.
- **The notifications bell shows your pending signatures and decisions**,
  replacing the template's sample notifications.
- **Background verification consent and employment checks on the onboarding
  form.**
  - A new Employment History step collects up to five previous employers,
    each with the supervisor IDfy will contact. Someone with no previous job
    ticks "no previous employment".
  - The consent card now spells out each check: identity and passport, AML
    (sanctions, PEP, adverse media) and employment records with previous
    employers and supervisors, all run by IDfy. The employee must approve it,
    and the wording version accepted is stored with the submission.
  - On submission, employment verification for the most recent employers (2 by
    default, adjustable under Integrations → IDfy) goes to IDfy Background
    Verification alongside AML and passport.
  - If the BGV account isn't set up, those checks wait as drafts.
  - HR sees the history and the consent on the submission page.
  - Needs `supabase/sql/20261014_onboarding_employment_bgv.sql`.
- **Unit tests in CI.** The dashboard has a `yarn test` (Vitest) step that
  blocks CI; the API runs `encore test` and a type check.
- **Vet existing onboarding submissions, and IDfy on the Integrations page.**
  Employee Vetting → "From Onboarding" lists every onboarding submission and
  runs the AML and passport checks for one the automatic run missed. A
  submission made before the consent checkbox needs the user to confirm the
  employee's consent, and that confirmation is recorded on the vetting.
  Integrations now has an IDfy card where a Super Admin can:
  - edit the EVE and BGV credentials and test the connection for free;
  - switch automatic onboarding vetting on or off and choose its checks;
  - track credits.
  IDfy has no balance API, so the remaining credits are estimated: the balance
  recorded from plans.idfy.com, minus the checks sent since, at the
  per-check rates. A low-balance email goes out once the estimate falls to the
  threshold, and a banner appears on the vetting page.
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
- `GET /appconfigs` now returns only office details to users who aren't Super
  Admins, and masks credential fields (API keys, secrets, tokens) for everyone.
  Previously any signed-in user could read the IDfy and Apollo credentials.
- Payroll, wallet, commission, sales and report endpoints now check page
  access, not just sign-in.
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
- **Detailed offer letter: contact details on the cover only.** The office phone,
  e-mail and address now appear once, in the cover page footer; the following
  pages keep only the IOTA mark at the top.
- **Sign-in page: the template's JWT, Firebase, Amplify, Auth0 and Supabase
  logos are gone.** IOTA signs in with Microsoft only; the logos were left
  over from the Minimal template and suggested other ways in.
- **NDA page: actions no longer float over the page.** The floating "Actions"
  panel covered buttons and content on the right of the NDA page. Actions
  now sit in two places. The title row has the one action the NDA needs now
  (Submit, Sign now, Remind Partner, Upload signed copy, Upload to OneDrive),
  Print, and a ⋯ menu for the occasional ones: Email review, Download with
  stamps, Download original and Cancel NDA. A banner under the title says
  what the NDA is waiting for, who still has to sign, or why it can't go out
  yet, and repeats that action.
- **NDA status follows review and exceptional approval.** Before an NDA goes
  for signature, its status is no longer just "Draft". On the NDA page and in
  the NDA list it reads Under Review (the AI review flagged clauses), Review
  Passed, Under Exceptional Approval, Exceptionally Approved or Exceptional
  Approval Rejected, then Pending IOTA Signatures, Pending Partner Signatures
  and so on. Editing the wording clears the review, so the status goes back
  to Draft. The next-step banner is restyled as a soft tinted card with the
  action that moves the NDA on.
- **NDAs: only approved people can sign for IOTA or approve an exception.**
  The IOTA signatory picker on NDAs lists only the people on appConfig
  ndas › iotaSignatories (Jaffar Meeran and Mohammed Zakiuddin to start),
  not every Microsoft user, and the API refuses anyone else. The same list
  decides who approves an NDA exception and who is emailed about one;
  previously that was every Admin and Super Admin. Add a person by adding
  their email or name to that appConfig entry. Offer letters keep their own
  list (offers › iotaSignatories).
- **Resume Formatting shows who each candidate is.** The library and a
  requirement's candidate list show the candidate's full name and email from
  the original resume, so two candidates who share a first name can be told
  apart; search matches them too. Internal only: the printed resume and client
  share links still carry the first name alone. Super Admins can fill in the
  email for resumes uploaded earlier ("Fill in candidate emails").
  - Needs `supabase/sql/20261012_talent_candidate_contacts.sql` (API repo).
- **An expired session signs the user out instead of failing request by
  request.** When the API reports a missing or expired token, or a second
  factor it never recorded for this session, the dashboard signs out and opens
  sign-in ("Your session has expired…"), returning to the same page afterwards.
  A Microsoft token that can no longer be refreshed (e.g. an expense receipt
  upload) does the same, since signing in issues a new one. Anything unsaved on
  the page is lost.
- **Issue emails carry the evidence.** The email for a new ticket attaches its
  screenshots and lists the failed API calls, backend errors, console errors,
  steps to reproduce and expected result; it previously had only the
  description and a link.
- **Removed the template's sample data (`_mock`) and the pages built on it.**
  - Gone: the E-commerce, Analytics, Booking, Course, File and Finance
    overview dashboards; Tour, Order, Product and Blog; Chat, Mail and Kanban;
    User billing and socials; the component showcase; and the public template
    site.
  - Kept: Banking (statement upload, transactions, reconciliation) and the
    User profile (synced from Microsoft 365) and cards, minus their sample
    widgets.
  - `/` now opens the dashboard. Calendar stays.
  - Removed from the navigation, along with the demo "Details/Edit" items
    that pointed at records that don't exist.
- The header contacts popover (sample people) was removed.
- **One API host for the whole dashboard.** About 70 hardcoded copies of the
  staging host now read `NEXT_PUBLIC_SERVER_URL` through `src/utils/api-host.js`,
  falling back to the same host as before.
- **Removed the template's unused sign-in providers** (JWT, Auth0, Amplify,
  Firebase), their pages and their packages. Sign-in is Supabase with
  Microsoft Entra ID only.
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
- **Uploaded proposals always show their own quotation number.** When an
  uploaded PDF is downloaded or previewed from Document Management, any
  "Quotation #XXXX-XXXX-XXXX" typed into it is reprinted, wherever it sits, as
  the document's ID and version (`Quotation #IP87-LZLL-PNCN-v2`). A proposal
  copied from an older one no longer goes out quoting that one's number. The
  number keeps its place and size; at the top right it stays right-aligned.
  The original in OneDrive is unchanged.
- **Bank statement upload reads the statement as the selected account's bank
  (ISS-0014).** Uploading to an existing account used the hidden Bank picker,
  which was empty after the dialog had been closed once, so the statement was
  read as Emirates NBD whatever the account. It now uses the account's own
  bank, and the server refuses an upload with no bank instead of guessing.
- **Offer letters: children's air tickets at 75%, and no empty Transportation
  row.** Clause 2.6 now covers you and your spouse up to the ticket cap, and
  up to the covered number of children at 75% of the ticket cost, capped at
  75% of the cap (SAR 1,500 against SAR 2,000). The one-page letter leaves out
  Transportation Allowance when there is none, as the detailed letter already
  did.
- **Offers can be archived.** An archived offer is withdrawn but kept: it is
  no longer listed, its signing and view links stop working, and the employee
  can be given a new offer (`sql/20261025_archive_offers.sql`, which can also
  restore them). A signing link now also stops working once its offer has
  been amended back to draft — the API checked only the link before.
- **A lapsed TOTP check asks for a code instead of signing you out.** The
  API wants the authenticator code again after 12 hours. When that happened
  in a tab left open (a laptop asleep overnight pauses the 8-hour prompt), the
  dashboard treated it as an expired session and sent you back through
  Microsoft sign-in. It now asks for the code and keeps you signed in, and
  checks the 8 hours again whenever the tab comes back into view. A session
  that has really expired now signs out only this browser, not your other
  devices.
- **The "Paste code" button is gone from code entry.** Browsers often refused
  it permission to read the clipboard, so it did nothing. Paste with ⌘V /
  Ctrl+V into the boxes (or long-press → Paste on a phone), as the hint says.
- **Foreign-currency ERP postings no longer fail over a cent.** Each journal
  line is converted to SAR and rounded on its own, so an invoice or expense in
  USD or AED could come out 0.01 unbalanced and fail to post. The engine now
  adds that rounding (at most half a cent per line) to the largest line on the
  short side, noted in its memo; a larger difference is still refused.
- **Candidates and employees are pointed to hr@iotatechnologies.ai.** Offer,
  signing, candidate intake and onboarding pages and emails gave
  hr@iotatechnologies.io. The documents site's fallback page now gives
  accounts@iotatechnologies.ai, and an address it doesn't serve shows
  "Document Not Found" instead of claiming the document expired.
- **Offer letter preview no longer comes out blank in the browser.** An
  earlier one-page letter used Arabic text that react-pdf's browser build
  cannot lay out (a sentence ending in a full stop after "لا", and the
  footer's "·" separator next to digits): it threw "undefined is not an
  object (evaluating 'a.id')" and the viewer stayed empty. The current
  letter avoids both, and was rendered in Chrome and Safari across validity
  dates and Arabic names. If a letter ever cannot be generated, the preview
  now says why next to the download button instead of showing a blank page.
- **"Paste code" on the authenticator (TOTP) screen works on phones.** It now
  reads a code copied as rich text too, and if the phone refuses clipboard
  access it puts the cursor in the first box so the phone's own Paste is one
  long-press away, with a hint that fits a phone instead of "⌘V". The reason
  for any refusal is logged, so an issue report filed afterwards shows it.
- **Files no longer asks to "Connect to OneDrive" (ISS-0013).** The page used
  a Microsoft token held in the browser: the sign-in token never carried a
  OneDrive permission, Supabase does not refresh Microsoft tokens, and each
  reload put the stale sign-in token back — so the page showed "OneDrive
  session expired. Please reconnect your account.", and "Sign in with
  Microsoft" failed with a 401 because that request went out without the IOTA
  session. The API now opens the signed-in user's own OneDrive with the app's
  credentials (`/onedrive/me/*`), as NDA, offer and expense uploads already
  do: no Microsoft sign-in, nothing to expire. Uploads go straight to OneDrive
  with no size limit. If loading fails, the page says why, with Retry.
- **NDAs: uploading the ink-signed copy no longer fails with "length limit
  exceeded".** "Mark Fully Executed & Upload" sent the whole signed document
  inside one API request, and larger scans went over the API's size limit.
  The file now goes straight from the browser to OneDrive (saved as
  `…_FullyExecuted`), and the API only records it. Files up to 60 MB.
- **Banking: bank statements are read inside the dashboard again.**
  Statement upload failed with "PDF parsing failed: Unknown error" because
  the separate PDF parser service on Render was switched off. Statements are
  now read by the dashboard itself, so there is no outside service left to
  fail. Saudi Investment Bank and Emirates NBD are supported, as before.
  Fixed on the way: Saudi Investment Bank statements from any year other
  than 2025 found no transactions, and a transaction whose description
  contained a word such as "Account" or "Balance" was skipped. After an
  upload, the dialog warns if the imported transactions don't add up to the
  statement's closing balance. Statements from other banks get a clear
  "cannot be read yet" message.
- **Expenses: attaching a receipt no longer fails with "Missing Microsoft
  access token".** Receipts were uploaded with the person's own Microsoft
  token, which the dashboard only receives at sign-in and which expires
  within the hour. Most uploads failed, and the ones that worked sat in the
  submitter's private OneDrive. Receipts now go through the API to the
  company OneDrive (Accounts/Expense Attachments/<year>/<month>), named
  `<date>_<uploader>_<file>`, with a link anyone at IOTA can open. Files up
  to 20 MB.
- **NDA documents stay downloadable after the signatories change.** An
  uploaded NDA's file was looked up in the first IOTA signatory's OneDrive
  at the time of reading. If the signatories changed after the upload,
  OneDrive answered 404, and the NDA's preview, print, download and
  placement screens came up empty. Each file now records the drive it is
  in. Older files are located from their own link and remembered. If a file
  is really gone, the NDA page says so, with a Retry button. Needs
  `20261019_nda_onedrive_drive.sql`.
- **"Paste code" now takes a code however it arrives.** A code from an
  authenticator app often comes in without a paste event: the phone
  keyboard's clipboard suggestion, "AutoFill from Messages/Passwords", or a
  password manager. It then landed in one box, and only its first digit was
  kept. A whole code typed or filled into any box now fills all six.
- **A blank signature can no longer be applied to an NDA or offer letter.**
  "Apply Signature" on the drawing pad was always enabled, so pressing it
  without signing put an empty box on the agreement. The pad now waits for
  enough ink to be a signature, and the API decodes every submitted signature
  (IOTA, partner and employee) and refuses one that is blank or just a
  scribble.
- **New offer: picking an onboarded employee no longer garbles the form.**
  The filled-in name, email, passport, nationality and position were drawn
  over their own labels, and an empty start date showed "required" before
  anyone could type. Labels now move up when a value is filled in, and only
  filled values are checked.
- **The "Stop emails from IOTA" link no longer shows an error.** It
  recorded the withdrawal but then failed writing the lead's history (the
  history requires an actor), so the person saw "Something went wrong".
- **Publishing a job now updates iotatechnologies.ai.** The site was
  published to the webflow.io subdomain only; it now publishes once to every
  custom domain (iotatechnologies.ai, www, careers). Saving an edit with
  "sync" also publishes, so edits go live.
- **Replies to leads now open with the IOTA banner.** The blue logo on a
  dark green header was nearly invisible; the header is now the "Innovate.
  Integrate. Elevate" banner with the white IOTA wordmark
  (`next-js/public/email/lead-reply-banner.jpg`, served from the dashboard).
- **Replying to a lead no longer fails with "domain is not verified".** The
  reply was sent *from* engagements@iotatechnologies.ai, a domain Resend has
  not verified. It now goes out from the verified IOTA sender address, like
  every other email, still named "IOTA Technologies". Answers still go to
  engagements@iotatechnologies.ai through Reply-To.
- **A resume's printed name keeps what the recruiter typed.** Saving a name
  that is one of the candidate's own name parts ("Azeem" for "M.A. Azeem")
  scrubbed it away and reset it to "Candidate". The typed word is now kept;
  only the other name parts are hidden. Initials are no longer taken as the
  first name on upload ("M.A. Azeem" prints as "Azeem", not "M.a.").
- **Resume Formatting reads PDFs with a damaged internal index.** A PDF
  re-saved by a mail client or phone app can carry a wrong cross-reference
  entry; reading it failed with "bad XRef entry", or silently dropped whole
  pages. The text is now read from a rebuilt copy of the file.
- **Resume Formatting reads image-only PDFs.** A CV designed in a layout tool
  and exported as a picture (or a scan) has no text layer, so formatting it
  failed with "No readable text was found". Its page images are now read by
  the AI vision model, as scanned NDAs already are; the error remains only when
  the images are in a format that cannot be read.
- **Issue reports carry their console log, page history and Sentry events,
  and browser errors reach Sentry.** The browser start-up file was named
  `instrumentation.client.ts`; Next.js only loads `instrumentation-client.ts`,
  so the recorder behind "Report an issue" and the browser's Sentry setup had
  never run. Renamed, with Sentry's navigation and server request-error hooks.
- **"Capture screen" captures what is actually on screen.** It shares the tab
  through the browser (one prompt per capture session) instead of re-drawing
  the page from its HTML, which came out black. If sharing is declined, the
  re-drawn capture is used with the page colour behind it, and a blank image
  is refused rather than attached.
- **Authenticator setup no longer rejects a correctly scanned code.** Until
  setup was finished, every sign-in (and "Resend") created a new secret and
  emailed a new QR code. Anyone who scanned an earlier one then got "Invalid
  code". An unfinished setup now keeps its secret and re-sends the same QR.
- **Scanned NDAs can be reviewed.** A PDF with no text layer used to fail with
  "No readable text was found". Its page images are now transcribed by AI
  first, and the review notes that it was read from a scan.
- New tasks and comments on the Sales and To Do boards are credited to you,
  not to a random sample person.
- The invoice list's service filter offers the services on your invoices, not
  sample service names.
- Page access no longer shows sample users when the user list fails to load.
- Opening an invoice to edit can no longer pick up a sample invoice.
- **VAT sync no longer drops a vendor's bill.** A bill counted as "already
  posted" when another document had the same number, so two vendors both
  billing "1001" lost one bill's input VAT. It now has to match the number,
  input or output, and the vendor or customer. The check is also one query
  instead of one request per record.
- **Simultaneous NDA and offer actions no longer overwrite each other.**
  - Signing, submitting, finalising, cancelling, reminders, review decisions
    and letter uploads now apply in one database transaction, and only if the
    record is still in the state the action expects.
  - Audit entries are appended by the database instead of rewritten.
  - A second signer or a double click gets "this changed while you were
    working on it, reload" rather than erasing the first signature.
  - NDA numbers come from a database sequence and are unique.
  - Needs `supabase/sql/20261015_guarded_updates.sql`; until it is run, state
    changes are still guarded by conditional updates.
- **Signatures and stamps land correctly on rotated or scanned PDFs.**
  Placements are mapped from the page as displayed. A placement on a page the
  document no longer has is reported, and Finalize stops on it instead of
  skipping it.
- **The NDA and offer pages no longer leak memory.** Each document preview
  copy is freed when it's replaced.
- The accounts invoice list no longer breaks when the invoice API fails.
- The IOTA billing total counts only amounts in SAR.
- **Invoice VAT is charged after the discount.** It was charged on the
  pre-discount subtotal, overstating VAT on every discounted invoice. Invoices
  and proformas now share one calculation: items, less discount, plus
  shipping, rounded to 2 dp.
- **ZATCA invoice totals add up.** The discount and shipping go into the XML
  as a document-level allowance and charge. An invoice whose saved totals
  don't add up is refused with a message to re-save it.
- **Invoices and proformas never print under another entity.** An unknown or
  shared currency is refused instead of falling back to IOTA Saudi. This covers
  the print pages, the issued PDF and employee-billing PDFs.
- **Backend permissions match the dashboard.** A user granted a page in Access
  Control no longer gets 403 from its API because their role's default says no.
- **Long lists are complete.** Invoices, expenses, NDAs, offers, pipeline deals
  and commissions are no longer cut off at Supabase's 1,000-row limit.
- **Browser errors reach Sentry.** The client now reads
  `NEXT_PUBLIC_SENTRY_DSN`, with `SENTRY_DSN` accepted too. Tracing is sampled
  at 10% in production.
- **Email review to IOTA: recipients now come from the Microsoft 365 directory.**
  To and Cc are picked by searching names or emails; typed addresses are only
  accepted when the directory can't be loaded. Send stayed disabled because a
  typed address only counted after Enter, so To looked empty; Send now says
  what is missing. "Save as default" can now be ticked whenever To has someone.
- **Publishing jobs to Webflow failed with "Field not described in schema".** The
  careers site was rebuilt and its Careers collection has new fields. Jobs now
  map to Position, Location, Position type, Contract type, Role description,
  Qualifications and Meta description.
- The NDA review panel now has its own "Email to IOTA" button, next to
  "Review again".
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
