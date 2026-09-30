# Employee Onboarding & Employee Billing — implementation plan

Point-in-time design note (2026-09-30). Two new HR modules, built on the
Candidate Intake pattern and the existing Invoice module, with the invoice
module itself changed as little as possible because Product and Professional
Services billing already run on it.

## 1. What is being built

| # | Capability | Where |
|---|---|---|
| 1 | **Employee Onboarding form** — a secure one-time link, OTP-verified, sent only to an employee who already exists in HR > Employees. The employee fills personal, contact, emergency, identity documents, family & dependants, bank/GOSI and insurance details. HR reviews the submission and **applies** it to the employee record. | Public: `aspirants.iotatechnologies.io/onboarding/<uuid>`. HR: Management > HR > Employee Onboarding |
| 2 | **Billing contracts** — a contract per customer (bank / organisation) of type *Single employee* or *Managed services* (many employees under one invoice). Each employee line carries a costed rate card: salary, GOSI employer contribution, insurance, iqama, tickets, Saudization, end-of-service accrual, admin fees, Zakat provision, IOTA charges. VAT/GST is applied at invoice level from the issuing office. | Management > HR > Employee Billing > Contracts |
| 3 | **Monthly invoice generation** — pick a period, preview what will be raised, generate. One invoice per contract per period (idempotent), pro-rated for lines that start or end mid-month. The invoice lands in the existing Invoice module as `pending` and follows the existing internal approval (super-admin, TOTP). | Management > HR > Employee Billing > Overview |
| 4 | **Collection pipeline** after internal approval — send to the customer's department contact with the PDF, record customer approval or query, request the payment receipt from Finance, mark paid. Every step is a validated transition with history, an automatic next-follow-up date, and counts of what is pending and what needs chasing. | Management > HR > Employee Billing > Overview, plus a stage chip on the Invoice list |

## 2. Status model

The existing `invoices.status` machine is **unchanged**:
`draft → pending → approved | rejected → paid` (plus the legacy `sent` written by Issue & Email).

Employee invoices add a `collectionStage` column that is only meaningful while
the invoice is `approved` (or legacy `sent`). The **effective stage** shown
everywhere is derived, so the approval code path needs no change:

| invoices.status | collectionStage | Effective stage |
|---|---|---|
| draft | – | `draft` |
| pending | – | `awaiting_approval` (internal) |
| rejected | – | `rejected` (edit & resubmit in Invoice module) |
| approved / sent | null | `ready_to_send` |
| approved / sent | sent_to_customer | `sent_to_customer` |
| approved / sent | customer_queried | `customer_queried` |
| approved / sent | customer_approved | `customer_approved` |
| approved / sent | receipt_requested | `receipt_requested` |
| paid | paid | `paid` |

Allowed transitions (enforced by the backend, one endpoint):

```
ready_to_send     → sent_to_customer         (Send with PDF, or "mark as sent")
sent_to_customer  → customer_approved | customer_queried
customer_queried  → sent_to_customer | customer_approved
customer_approved → receipt_requested
receipt_requested → paid                     (admin/superAdmin; also flips invoices.status and the AR row)
```

Each transition appends to `stageHistory` (who, when, note) and sets
`nextFollowUpDate` (defaults: sent +5d, queried +2d, customer approved +3d,
receipt requested +7d; overridable). **Needs follow-up** = not paid and
(`nextFollowUpDate` ≤ today or `dueDate` < today). The overview shows counts and
amounts per effective stage and a "needs follow-up" queue.

### Contract lifecycle (customer flow)

`draft → proposal_sent → customer_approved → sow_received → signed → active →
renewal_due → ended` (plus `suspended`). The contract carries the approved
proposal id, SOW number, requisition number, received/signed dates, the signed
SOW file, term in months, renewal date and `renewedFromContractId`
(`sql/add_sow_to_employee_billing_contracts.sql`). Only `active` and
`renewal_due` contracts are billed. A renewal is a new contract pointing at the
old one, so rate cards can change at renewal without rewriting history.

## 3. Rate card (GOSI, Zakat, VAT)

Per contract line the backend computes line items with the same formula engine
the Resource Calculation quotation already uses (`shared/costing.ts`, copied
from `profile.ts` so that module is untouched). The template lives in
`appConfig` namespace `employeeBilling`, key `ksa_employee_billing_line_items`,
so Finance can change rates without a deploy. Formula context:
`baseSalary, basicSalary, housingAllowance, dependentsCount, familyPax, isExpat,
gosiRate`.

Defaults seeded (KSA):

| Line | Formula / default | Note |
|---|---|---|
| Salary | `baseSalary` | basic + housing + transport + other from the employee record, editable |
| GOSI employer contribution | `(basicSalary + housingAllowance) * gosiRate` | `gosiRate` 11.75% Saudi nationals, 2% expatriates (config `gosi_rates`) |
| Medical insurance | `insuranceCostPerPax × pax / 12` | pax = 1, or dependants + 2 with family status |
| Iqama / work permit | `1000 * isExpat` | |
| Annual tickets & exit re-entry | `ticketCostPerPax × pax / 12 × isExpat` | |
| Saudization charges | `2850 * isExpat` | |
| End of service accrual | `baseSalary / 12` | |
| Admin / operating cost & govt fees | `500` | |
| Zakat provision | `baseSalary * 0.025`, **inactive by default** | Zakat is levied on the entity's zakat base, not per employee. Seeded as an optional provision line; Finance decides the basis and switches it on per contract. |
| IOTA charges | 9000, editable | margin, flat |

Monthly rate = sum of active lines. VAT/GST rate comes from `vatConfig` by the
contract's issuing office (KSA 15, UAE 5, India 18, UK 20) and is applied on the
invoice, exactly as the existing form does.

## 4. Backend (`../IOTAApiServer/iotaapiserver`)

New Encore services, both talking to Supabase REST like every other service:

- `employeeonboarding/` — `POST/GET /employee-onboarding/tokens` (auth), `POST /employee-onboarding/tokens/:id/revoke` (auth), public `GET /employee-onboarding/tokens/:token`, `…/request-otp`, `…/verify-otp`, `…/submit`, `GET /employee-onboarding/submissions[/:id]` (auth), `POST /employee-onboarding/submissions/:id/apply` (auth, manager+). Server-side mandatory-field validation. HR endpoints carry `auth: true` (the candidate-intake ones do not — noted, not changed here).
- `employeebilling/` — contracts CRUD, `POST /employee-billing/contracts/:id/lines/compute` (rate card), `GET /employee-billing/runs/preview?period=`, `POST /employee-billing/runs` (generate), `GET /employee-billing/invoices`, `GET /employee-billing/summary`, `POST /employee-billing/invoices/:invoiceId/send` (email PDF to department contact), `POST /employee-billing/invoices/:invoiceId/stage`, `POST /employee-billing/invoices/:invoiceId/follow-up`. Generation calls the existing `supabase.createInvoice` through `~encore/clients` so admin "pending approval" notifications still fire.
- `shared/costing.ts` — formula engine (copy of `computeTotals`).
- Email templates: onboarding link, onboarding submitted (employee), onboarding HR notification, employee invoice to customer. OTP reuses the candidate-intake OTP template.

SQL (run in Supabase SQL editor, in order):

1. `sql/create_employee_onboarding_tables.sql` — `employeeOnboardingTokens`, `employeeOnboardingSubmissions`, `employeeOnboardingAuditLog`; `ALTER employees` adds onboarding status, spouse/dependants, alternate phone, personal email, emergency contact relationship, national ID.
2. `sql/create_employee_billing_tables.sql` — `employeeBillingContracts`, `employeeBillingContractLines`, `employeeBillingInvoices`; `ALTER invoices` adds `billingContractId`, `billingPeriod`, `collectionStage`, `collectionStageUpdatedAt`, `nextFollowUpDate`; new `invoiceType` rows *Employee Contract Invoice* (employee-related) and *Managed Services Invoice*; `appConfig` seed for the rate card and GOSI rates; `navPermissions` rows for the three new paths.

## 5. Frontend (`next-js`)

- Public form: `src/app/employee-onboarding/[token]/page.jsx` → `src/sections/employee-onboarding/onboarding-public-form.jsx` (8 steps, per-step mandatory validation). `src/middleware.ts` gains an `/onboarding/<uuid>` rewrite on the aspirants host.
- HR: `src/app/dashboard/hr/employee-onboarding/` (list + details, PageGuard wrappers) → `src/sections/employee-onboarding/view/*`.
- Billing: `src/app/dashboard/hr/employee-billing/` (overview, contracts list/new/details/edit) → `src/sections/employee-billing/view/*` and components (stage chip, transition dialog, send dialog, generate dialog, rate-card editor).
- Data layer: `src/actions/employee-onboarding.js`, `src/actions/employee-billing.js` on the shared `src/lib/iota-api` client.
- Routes in `src/routes/paths.js`, nav entries under HR.

**Invoice module touch (deliberately tiny):**

1. `invoice-list-view.jsx` — the row mapper carries `collectionStage` and `billingPeriod` through (3 lines).
2. `invoice-table-row.jsx` — shows a second small label with the collection stage when present (one block).
3. Backend `approveInvoice` — skips the automatic proforma for invoices that carry `billingContractId` (one guard). Everything else (approval dialog, TOTP, OneDrive upload, ZATCA, AR ledger, mark-paid) is reused as is.

## 6. Out of scope / follow-ups noted while mapping

- Candidate-intake HR endpoints have no `auth: true`; the new onboarding service does. Worth back-porting.
- Existing invoice quirks left alone: Issue & Email sets `status='sent'` from any state and mark-paid then refuses it; the approval-time PDF is built from a list row with no line items; ZATCA XML carries no lines; shipping is subtracted from the total in the form.
- File uploads (passport/iqama scans) on the public onboarding form: `POST /documents/upload` is public today, but the form does not upload files in this iteration; HR attaches documents on the employee record.
