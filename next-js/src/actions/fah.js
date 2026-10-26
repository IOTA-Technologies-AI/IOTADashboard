import useSWR, { mutate } from 'swr';

import iotaApi from 'src/lib/iota-api';

/**
 * Finance → Accounting: the Financial Accounting Hub (general ledger). Every
 * call goes to the `fah` service in the API (fah/*.ts), which checks the
 * caller's finance role on each request.
 */

const fetcher = ([url, params]) => iotaApi.get(url, { params }).then((res) => res.data);
const options = { revalidateOnFocus: false, keepPreviousData: true };
// Stable empty lists, so effects keyed on a list do not re-run while loading.
const EMPTY = [];
const DEFAULT_THRESHOLDS = { controller: 50000, cfo: 500000 };

/** Refetch every FAH screen's data after a change. */
export const refreshFah = () =>
  mutate((key) => Array.isArray(key) && String(key[0]).startsWith('/fah'));

/** The message to show for a failed call. */
export const fahError = (err) =>
  err?.response?.data?.message || err?.message || 'Something went wrong. Try again.';

const send = async (method, url, body) => {
  const res = await iotaApi.request({ method, url, data: body });
  await refreshFah();
  return res.data;
};

// ----------------------------------------------------------------------
// Who am I, and the catalogue every screen needs

/** { me: { email, roles, rank, canPrepare, canControl, isCfo }, loading, error } */
export function useFahMe() {
  const { data, error, isLoading } = useSWR(['/fah/me', {}], fetcher, options);
  return { me: data ?? null, error, loading: isLoading };
}

export function useFahCatalog(enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled ? ['/fah/catalog', {}] : null,
    fetcher,
    options
  );
  return {
    entities: data?.entities ?? EMPTY,
    practices: data?.practices ?? EMPTY,
    costCentres: data?.costCentres ?? EMPTY,
    locations: data?.locations ?? EMPTY,
    engagements: data?.engagements ?? EMPTY,
    accounts: data?.accounts ?? EMPTY,
    currencies: data?.currencies ?? EMPTY,
    thresholds: data?.thresholds ?? DEFAULT_THRESHOLDS,
    maxOpenPeriods: data?.maxOpenPeriods ?? 2,
    error,
    loading: isLoading,
  };
}

// ----------------------------------------------------------------------
// Journals

export function useJournals(params) {
  const { data, error, isLoading, isValidating } = useSWR(
    ['/fah/journals', params],
    fetcher,
    options
  );
  return {
    journals: data?.journals ?? EMPTY,
    total: data?.total ?? 0,
    counts: data?.counts ?? EMPTY,
    error,
    loading: isLoading,
    validating: isValidating,
  };
}

/** { journal, lines, audit, problems, needsOverride, overrideAccounts, actions } */
export function useJournal(id) {
  const { data, error, isLoading } = useSWR(
    id ? [`/fah/journals/${id}`, {}] : null,
    fetcher,
    options
  );
  return {
    journal: data?.journal ?? null,
    lines: data?.lines ?? EMPTY,
    audit: data?.audit ?? EMPTY,
    problems: data?.problems ?? EMPTY,
    needsOverride: data?.needsOverride ?? false,
    overrideAccounts: data?.overrideAccounts ?? EMPTY,
    actions: data?.actions ?? EMPTY,
    error,
    loading: isLoading,
  };
}

/** Create (no id) or replace a draft and its lines. Returns the journal detail. */
export const saveJournal = (payload) => send('post', '/fah/journals', payload);

/** A draft from a CSV of lines: { detail, problems, importedLines }. */
export const importJournal = (payload) => send('post', '/fah/journal-imports', payload);

/** { detail, problems }: problems non-empty means it was not submitted. */
export const submitJournal = (id, controlOverrideReason) =>
  send('post', `/fah/journals/${id}/submit`, { controlOverrideReason });

export const withdrawJournal = (id) => send('post', `/fah/journals/${id}/withdraw`, {});
export const approveJournal = (id) => send('post', `/fah/journals/${id}/approve`, {});
export const rejectJournal = (id, reason) => send('post', `/fah/journals/${id}/reject`, { reason });
export const postJournal = (id) => send('post', `/fah/journals/${id}/post`, {});
/** Returns the detail of the reversal journal. */
export const reverseJournal = (id, { date, reason }) =>
  send('post', `/fah/journals/${id}/reverse`, { date, reason });
export const deleteJournal = (id) => send('delete', `/fah/journals/${id}`);

// ----------------------------------------------------------------------
// Chart of accounts

export const createAccount = (payload) => send('post', '/fah/accounts', payload);
export const updateAccount = (id, patch) => send('patch', `/fah/accounts/${id}`, patch);
/** { rows, created, updated, problems }; apply false only checks. */
export const importChart = (csv, apply) => send('post', '/fah/account-imports', { csv, apply });
export const exportChart = () => iotaApi.get('/fah/account-export').then((res) => res.data.csv);

// ----------------------------------------------------------------------
// Dimensions

export const createPractice = (payload) => send('post', '/fah/practices', payload);
export const updatePractice = (id, patch) => send('patch', `/fah/practices/${id}`, patch);
export const createCostCentre = (payload) => send('post', '/fah/cost-centres', payload);
export const updateCostCentre = (id, patch) => send('patch', `/fah/cost-centres/${id}`, patch);
export const createEngagement = (payload) => send('post', '/fah/engagements', payload);
export const updateEngagement = (id, patch) => send('patch', `/fah/engagements/${id}`, patch);

export function useEmployeePractice(enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled ? ['/fah/employee-practice', {}] : null,
    fetcher,
    options
  );
  return { assignments: data?.assignments ?? EMPTY, error, loading: isLoading };
}

export const createEmployeePractice = (payload) => send('post', '/fah/employee-practice', payload);
export const updateEmployeePractice = (id, patch) =>
  send('patch', `/fah/employee-practice/${id}`, patch);

/** ERP employees, read-only: [{ id, employeeCode, name, department, employmentStatus }] */
export function useErpEmployees(enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled ? ['/fah/erp/employees', {}] : null,
    fetcher,
    options
  );
  return { employees: data?.employees ?? EMPTY, error, loading: isLoading };
}

/** ERP customers, read-only: [{ id, name }] */
export function useErpCustomers(enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled ? ['/fah/erp/customers', {}] : null,
    fetcher,
    options
  );
  return { customers: data?.customers ?? EMPTY, error, loading: isLoading };
}

// ----------------------------------------------------------------------
// Periods

/** { periods: [... , journalCount], years } */
export function usePeriods(legalEntityId, year) {
  const { data, error, isLoading } = useSWR(
    legalEntityId && year ? ['/fah/periods', { legalEntityId, year }] : null,
    fetcher,
    options
  );
  return {
    periods: data?.periods ?? EMPTY,
    years: data?.years ?? EMPTY,
    error,
    loading: isLoading,
  };
}

export const setPeriodStatus = (id, status) =>
  send('post', `/fah/periods/${id}/status`, { status });
export const ensureFiscalYear = (legalEntityId, year) =>
  send('post', '/fah/fiscal-years', { legalEntityId, year });

// ----------------------------------------------------------------------
// Exchange rates

export function useRates(currency) {
  const { data, error, isLoading } = useSWR(
    ['/fah/rates', currency ? { currency } : {}],
    fetcher,
    options
  );
  return { rates: data?.rates ?? EMPTY, error, loading: isLoading };
}

export const createRate = (payload) => send('post', '/fah/rates', payload);

// ----------------------------------------------------------------------
// Finance roles

export function useFahRoles(enabled = true) {
  const { data, error, isLoading } = useSWR(enabled ? ['/fah/roles', {}] : null, fetcher, options);
  return {
    assignments: data?.assignments ?? EMPTY,
    roles: data?.roles ?? EMPTY,
    error,
    loading: isLoading,
  };
}

export const grantRole = (payload) => send('post', '/fah/roles', payload);
export const revokeRole = (id) => send('delete', `/fah/roles/${id}`);

// ----------------------------------------------------------------------
// Reports

/** params: { legalEntityId?, year, fromPeriod, toPeriod, by } */
export function useTrialBalance(params, enabled = true) {
  const { data, error, isLoading, isValidating } = useSWR(
    enabled && params?.year ? ['/fah/trial-balance', params] : null,
    fetcher,
    options
  );
  return {
    rows: data?.rows ?? EMPTY,
    totals: data?.totals ?? null,
    balanced: data?.balanced ?? true,
    error,
    loading: isLoading,
    validating: isValidating,
  };
}

export const trialBalanceCsv = (params) =>
  iotaApi
    .get('/fah/trial-balance', { params: { ...params, format: 'csv' } })
    .then((res) => res.data.csv);

/** GL inquiry over posted lines. */
export function useLedger(params, enabled = true) {
  const { data, error, isLoading, isValidating } = useSWR(
    enabled ? ['/fah/ledger', params] : null,
    fetcher,
    options
  );
  return {
    lines: data?.lines ?? EMPTY,
    total: data?.total ?? 0,
    error,
    loading: isLoading,
    validating: isValidating,
  };
}

export function useFahAudit(params, enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled ? ['/fah/audit', params] : null,
    fetcher,
    options
  );
  return { entries: data?.entries ?? EMPTY, total: data?.total ?? 0, error, loading: isLoading };
}

/** { driftRows, applied }; apply (CFO) rebuilds the cache from the lines. */
export const verifyBalances = (apply = false) => send('post', '/fah/balances/verify', { apply });

// ----------------------------------------------------------------------
// Files

export function downloadText(text, fileName, type = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ----------------------------------------------------------------------
// Phase 2: ERP postings (events, exceptions, rules, backfill, tagging)

/** params: { status?: 'PROBLEMS'|status, sourceTable?, eventType?, offset, limit } */
export function useFahEvents(params, enabled = true) {
  const { data, error, isLoading, isValidating } = useSWR(
    enabled ? ['/fah/events', params] : null,
    fetcher,
    options
  );
  return {
    events: data?.events ?? EMPTY,
    total: data?.total ?? 0,
    counts: data?.counts ?? EMPTY,
    error,
    loading: isLoading,
    validating: isValidating,
  };
}

/** { event, snapshot, payload, simulation, journals } */
export function useFahEvent(id) {
  const { data, error, isLoading } = useSWR(
    id ? [`/fah/events/${id}`, {}] : null,
    fetcher,
    options
  );
  return { detail: data ?? null, error, loading: isLoading };
}

export const retryEvent = (id) => send('post', `/fah/events/${id}/retry`, {});
export const ignoreEvent = (id, reason) => send('post', `/fah/events/${id}/ignore`, { reason });
/** { processed, posted, ignored, waiting, failed, superseded } */
export const runEngine = (untilDone = false) => send('post', '/fah/engine/run', { untilDone });

export function usePostingRules() {
  const { data, error, isLoading } = useSWR(['/fah/posting-rules', {}], fetcher, options);
  return { rules: data?.rules ?? EMPTY, error, loading: isLoading };
}
export const updatePostingRule = (eventType, patch) =>
  send('patch', `/fah/posting-rules/${eventType}`, patch);

/** { invoiceTypes, expenseTypes, unmappedExpenseTypes, unmappedInvoiceTypes } */
export function useTypeMaps(enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled ? ['/fah/type-maps', {}] : null,
    fetcher,
    options
  );
  return {
    invoiceTypes: data?.invoiceTypes ?? EMPTY,
    expenseTypes: data?.expenseTypes ?? EMPTY,
    unmappedExpenseTypes: data?.unmappedExpenseTypes ?? EMPTY,
    unmappedInvoiceTypes: data?.unmappedInvoiceTypes ?? EMPTY,
    error,
    loading: isLoading,
  };
}
export const saveExpenseTypeMap = (id, body) => send('put', `/fah/type-maps/expense/${id}`, body);
export const saveInvoiceTypeMap = (id, body) => send('put', `/fah/type-maps/invoice/${id}`, body);

/** dryRun true counts only (controller); false queues and posts (CFO). */
export const backfill = (from, dryRun = true) => send('post', '/fah/backfill', { from, dryRun });

/** params: { review?, sourceTable?, offset, limit } */
export function useFahTags(params, enabled = true) {
  const { data, error, isLoading, isValidating } = useSWR(
    enabled ? ['/fah/tags', params] : null,
    fetcher,
    options
  );
  return {
    tags: data?.tags ?? EMPTY,
    total: data?.total ?? 0,
    error,
    loading: isLoading,
    validating: isValidating,
  };
}
/** Tag an invoice/expense/payroll run by hand; it is reposted if already posted. */
export const setTag = (payload) => send('put', '/fah/tags', payload);

export function useCustomerDefaults(enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled ? ['/fah/customer-defaults', {}] : null,
    fetcher,
    options
  );
  return { defaults: data?.defaults ?? EMPTY, error, loading: isLoading };
}
export const setCustomerDefault = (customerId, body) =>
  send('put', `/fah/customer-defaults/${customerId}`, body);
export const deleteCustomerDefault = (customerId) =>
  send('delete', `/fah/customer-defaults/${customerId}`);

/** The ledger side of one ERP row: { journals, tag, pending, problems }. */
export function useSourceLedger(sourceTable, sourceId, enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled && sourceTable && sourceId ? [`/fah/sources/${sourceTable}/${sourceId}`, {}] : null,
    fetcher,
    options
  );
  return { ledger: data ?? null, error, loading: isLoading };
}

// Reimbursements (D-17)
export function useReimbursementsOwed(enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled ? ['/fah/reimbursements/owed', {}] : null,
    fetcher,
    options
  );
  return { employees: data?.employees ?? EMPTY, error, loading: isLoading };
}
export function useReimbursements(enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled ? ['/fah/reimbursements', {}] : null,
    fetcher,
    options
  );
  return { reimbursements: data?.reimbursements ?? EMPTY, error, loading: isLoading };
}
/** { reimbursement, problems } */
export const recordReimbursement = (payload) => send('post', '/fah/reimbursements', payload);

// Reconciliations
/** { cutover, rows: [{ key, accounts, label, gl, erp, difference, note }] } */
export function useReconciliation(enabled = true) {
  const { data, error, isLoading, isValidating } = useSWR(
    enabled ? ['/fah/reconciliation', {}] : null,
    fetcher,
    options
  );
  return {
    cutover: data?.cutover ?? null,
    rows: data?.rows ?? EMPTY,
    error,
    loading: isLoading,
    validating: isValidating,
  };
}
/** { year, sections: [{ key, label, erp, bridge: [{label, amount}], expectedGl, gl, unexplained }] } */
export function usePlBridge(year, enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled && year ? ['/fah/pl-bridge', { year }] : null,
    fetcher,
    options
  );
  return { sections: data?.sections ?? EMPTY, error, loading: isLoading };
}

/** Soft-close every future or open month of a book up to a date (reviewed history). */
export const softCloseHistory = (legalEntityId, upTo) =>
  send('post', '/fah/periods/soft-close-history', { legalEntityId, upTo });

// ----------------------------------------------------------------------
// Cost centres and allocations (Phase 3)

/** { period, preview, run, upToDate, snapshots, rules, canPost } for one book and month. */
export function useAllocationMonth(legalEntityId, periodId) {
  const { data, error, isLoading, isValidating } = useSWR(
    legalEntityId && periodId ? ['/fah/allocations', { legalEntityId, periodId }] : null,
    fetcher,
    options
  );
  return { month: data ?? null, error, loading: isLoading, validating: isValidating };
}

/** Post the month's allocation; expectedRunId is the run the preview was shown against. */
export const postAllocation = (payload) => send('post', '/fah/allocations/run', payload);
export const reverseAllocation = (id) => send('post', `/fah/allocation-runs/${id}/reverse`, {});

export function useAllocationRuns(legalEntityId) {
  const { data, error, isLoading } = useSWR(
    legalEntityId ? ['/fah/allocation-runs', { legalEntityId }] : null,
    fetcher,
    options
  );
  return { runs: data?.runs ?? EMPTY, error, loading: isLoading };
}

export function useAllocationRun(id) {
  const { data, error, isLoading } = useSWR(
    id ? [`/fah/allocation-runs/${id}`, {}] : null,
    fetcher,
    options
  );
  return { run: data ?? null, error, loading: isLoading };
}

export function useAllocationRules(enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled ? ['/fah/allocation-rules', {}] : null,
    fetcher,
    options
  );
  return { rules: data?.rules ?? EMPTY, error, loading: isLoading };
}

/** Saves a new version of a centre's rule, from its effective date. */
export const saveAllocationRule = (payload) => send('post', '/fah/allocation-rules', payload);

/** { current, alternative, practices } — nothing is posted. */
export const allocationWhatIf = (payload) =>
  iotaApi.post('/fah/allocations/what-if', payload).then((res) => res.data);

export function useHeadcountPreview(legalEntityId, periodId) {
  const { data, error, isLoading } = useSWR(
    legalEntityId && periodId ? ['/fah/drivers/headcount', { legalEntityId, periodId }] : null,
    fetcher,
    options
  );
  return { headcount: data ?? null, error, loading: isLoading };
}

export const postHeadcount = (legalEntityId, periodId) =>
  send('post', '/fah/drivers/headcount', { legalEntityId, periodId });
export const postManualDrivers = (payload) => send('post', '/fah/drivers/manual', payload);

export function useCostCentreReport(params, enabled = true) {
  const { data, error, isLoading } = useSWR(
    enabled && params?.legalEntityId ? ['/fah/cost-centre-report', params] : null,
    fetcher,
    options
  );
  return { rows: data?.rows ?? EMPTY, error, loading: isLoading };
}

/**
 * Expenses still crediting an employee (2105) re-posted as paid by the company
 * (1025). dryRun lists them: { employees: [{ employeeName, total, expenses, skipped }], expenses, total }.
 */
export const repostCompanyPaidExpenses = (dryRun = true) =>
  dryRun
    ? iotaApi.post('/fah/expenses/company-paid', { dryRun }).then((res) => res.data)
    : send('post', '/fah/expenses/company-paid', { dryRun });

// ----------------------------------------------------------------------
// Inter-practice charges and profit share (Phase 4)

const useList = (url, key, params = {}, enabled = true) => {
  const { data, error, isLoading } = useSWR(enabled ? [url, params] : null, fetcher, options);
  return { [key]: data?.[key] ?? EMPTY, error, loading: isLoading };
};

export const useRateCards = () => useList('/fah/rate-cards', 'rateCards');
export const createRateCard = (payload) => send('post', '/fah/rate-cards', payload);
export const approveRateCard = (id) => send('post', `/fah/rate-cards/${id}/approve`, {});

export const useIpAgreements = () => useList('/fah/ip-agreements', 'agreements');
export const createIpAgreement = (payload) => send('post', '/fah/ip-agreements', payload);
export const endIpAgreement = (id, effectiveTo) =>
  send('post', `/fah/ip-agreements/${id}/end`, { effectiveTo });

export const useIpTransactions = (status) =>
  useList('/fah/ip-transactions', 'transactions', status ? { status } : {});
export const createIpTransaction = (payload) => send('post', '/fah/ip-transactions', payload);
/** { applied, rows: [{ line, agreementCode, amount, problem }], created } */
export const importIpTransactions = (csv, apply) =>
  send('post', '/fah/ip-transactions/import', { csv, apply });
/** { transaction, problem } — the charge posts once both sides have approved. */
export const approveIpTransaction = (id, side) =>
  send('post', `/fah/ip-transactions/${id}/approve`, { side });
export const postIpTransaction = (id) => send('post', `/fah/ip-transactions/${id}/post`, {});
export const disputeIpTransaction = (id, reason) =>
  send('post', `/fah/ip-transactions/${id}/dispute`, { reason });
export const reopenIpTransaction = (id, patch) =>
  send('post', `/fah/ip-transactions/${id}/reopen`, patch);
export const cancelIpTransaction = (id) => send('post', `/fah/ip-transactions/${id}/cancel`, {});

export function useIpMatrix(params) {
  const { data, error, isLoading } = useSWR(
    params?.legalEntityId ? ['/fah/ip-matrix', params] : null,
    fetcher,
    options
  );
  return { matrix: data ?? null, error, loading: isLoading };
}

export function usePracticeResults(params) {
  const { data, error, isLoading } = useSWR(
    params?.year ? ['/fah/practice-results', params] : null,
    fetcher,
    options
  );
  return { results: data ?? null, error, loading: isLoading };
}

export const useProfitShareAgreements = () => useList('/fah/profit-share-agreements', 'agreements');
export const createProfitShareAgreement = (payload) =>
  send('post', '/fah/profit-share-agreements', payload);
/** as: 'controller' or the practice id the caller leads. */
export const approveProfitShareAgreement = (id, as) =>
  send('post', `/fah/profit-share-agreements/${id}/approve`, { as });

export function useProfitSharePreview(params) {
  const { data, error, isLoading, isValidating } = useSWR(
    params?.engagementId && params?.legalEntityId && params?.periodId
      ? ['/fah/profit-share/preview', params]
      : null,
    fetcher,
    options
  );
  return { preview: data ?? null, error, loading: isLoading, validating: isValidating };
}
export const postProfitShare = (payload) => send('post', '/fah/profit-share/run', payload);
export const useProfitShareRuns = () => useList('/fah/profit-share/runs', 'runs');
