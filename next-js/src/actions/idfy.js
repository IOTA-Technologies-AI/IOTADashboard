import iotaApi from 'src/lib/iota-api';

/**
 * IDfy administration: credentials, the automatic-vetting switch and the
 * credit ledger. See vetting/idfyCredits.ts in the API. IDfy has no balance
 * API, so the remaining credits are an estimate from the recorded balance.
 */

export async function getIdfyStatus() {
  const res = await iotaApi.get('/idfy/status');
  return res.data;
}

/** product: 'eve' | 'bgv'. An empty apiKey keeps the stored one. */
export async function setIdfyCredentials(body) {
  const res = await iotaApi.put('/idfy/credentials', body);
  return res.data;
}

export async function testIdfyConnection() {
  const res = await iotaApi.post('/idfy/test', {});
  return res.data;
}

export async function setIdfyCredits(body) {
  const res = await iotaApi.put('/idfy/credits', body);
  return res.data;
}

export async function setIdfyAutoRun(enabled, checks, maxEmployers) {
  const res = await iotaApi.put('/idfy/auto-run', { enabled, checks, maxEmployers });
  return res.data;
}
