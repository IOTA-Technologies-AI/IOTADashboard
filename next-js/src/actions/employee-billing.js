import iotaApi from 'src/lib/iota-api';

/**
 * Employee billing — contracts, rate cards, monthly generation and the
 * collection pipeline. All calls go through the shared client, which attaches
 * the live bearer token.
 */

// ─── Rate card ───────────────────────────────────────────────────────────────

export async function getRateCardTemplate(iotaOffice = 'KSA') {
  const response = await iotaApi.get('/employee-billing/rate-card/template', {
    params: { iotaOffice },
  });
  return response.data;
}

export async function computeRateCard(inputs) {
  const response = await iotaApi.post('/employee-billing/rate-card/compute', inputs);
  return response.data;
}

// ─── Contracts ───────────────────────────────────────────────────────────────

export async function listContracts(params = {}) {
  const response = await iotaApi.get('/employee-billing/contracts', { params });
  return response.data?.contracts || [];
}

export async function getContract(id) {
  const response = await iotaApi.get(`/employee-billing/contracts/${id}`);
  return response.data;
}

export async function createContract(payload) {
  const response = await iotaApi.post('/employee-billing/contracts', payload);
  return response.data?.contract;
}

export async function updateContract(id, payload) {
  const response = await iotaApi.patch(`/employee-billing/contracts/${id}`, payload);
  return response.data?.contract;
}

export async function deleteContract(id) {
  const response = await iotaApi.delete(`/employee-billing/contracts/${id}`);
  return response.data;
}

export async function addContractLine(contractId, payload) {
  const response = await iotaApi.post(`/employee-billing/contracts/${contractId}/lines`, payload);
  return response.data?.line;
}

export async function updateContractLine(contractId, lineId, payload) {
  const response = await iotaApi.patch(
    `/employee-billing/contracts/${contractId}/lines/${lineId}`,
    payload
  );
  return response.data?.line;
}

export async function deleteContractLine(contractId, lineId) {
  const response = await iotaApi.delete(
    `/employee-billing/contracts/${contractId}/lines/${lineId}`
  );
  return response.data;
}

// ─── Monthly runs ────────────────────────────────────────────────────────────

export async function previewBillingRun(period, contractIds) {
  const response = await iotaApi.get('/employee-billing/runs/preview', {
    params: { period, ...(contractIds?.length ? { contractIds: contractIds.join(',') } : {}) },
  });
  return response.data;
}

export async function generateBillingRun(payload) {
  const response = await iotaApi.post('/employee-billing/runs', payload);
  return response.data;
}

// ─── Collection pipeline ─────────────────────────────────────────────────────

export async function listBillingInvoices(params = {}) {
  const response = await iotaApi.get('/employee-billing/invoices', { params });
  return response.data?.invoices || [];
}

export async function getBillingInvoice(invoiceId) {
  const response = await iotaApi.get(`/employee-billing/invoices/${invoiceId}`);
  return response.data?.invoice;
}

export async function getBillingSummary() {
  const response = await iotaApi.get('/employee-billing/summary');
  return response.data;
}

export async function sendBillingInvoice(invoiceId, payload) {
  const response = await iotaApi.post(`/employee-billing/invoices/${invoiceId}/send`, payload);
  return response.data?.invoice;
}

export async function transitionBillingStage(invoiceId, payload) {
  const response = await iotaApi.post(`/employee-billing/invoices/${invoiceId}/stage`, payload);
  return response.data?.invoice;
}

export async function recordBillingFollowUp(invoiceId, payload) {
  const response = await iotaApi.post(`/employee-billing/invoices/${invoiceId}/follow-up`, payload);
  return response.data?.invoice;
}
