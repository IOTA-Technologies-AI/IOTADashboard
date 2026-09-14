import { NextResponse } from 'next/server';

import { CONFIG } from 'src/global-config';

const normalizeHost = (url) =>
  (url || 'https://staging-iotaapiserver-s572.encr.app')
    .replace(/\/supabaseservices\/?$/, '')
    .replace(/\/$/, '');

const BASE_URL = normalizeHost(CONFIG.serverUrl);
const buildHeaders = (request) => ({
  'Content-Type': 'application/json',
  // Forward the caller's session token. The Encore API authenticates every
  // non-public endpoint at the gateway, so a proxy that drops the bearer
  // token gets a 401. The `apikey` header this replaces was a PostgREST
  // convention that Encore never read.
  Authorization: request?.headers?.get('authorization') ?? '',
});

export async function GET(request) {
  try {
    console.log('[Proxy] Fetching cost centers from:', `${BASE_URL}/costcenters`);
    const res = await fetch(`${BASE_URL}/costcenters`, {
      method: 'GET',
      headers: buildHeaders(request),
    });
    const data = await res.json();
    console.log('[Proxy] Cost centers response:', data);
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Proxy] /api/costcenters GET failed:', error);
    return NextResponse.json(
      { costCenters: [], message: error.message || 'Failed to fetch cost centers' },
      { status: 500 }
    );
  }
}
