import { NextResponse } from 'next/server';

import { normalizeApiHost } from 'src/utils/api-host';

import { CONFIG } from 'src/global-config';

const normalizeHost = normalizeApiHost;

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
    console.log('[Proxy] Fetching invoice types from:', `${BASE_URL}/invoicetypes`);
    const res = await fetch(`${BASE_URL}/invoicetypes`, {
      method: 'GET',
      headers: buildHeaders(request),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Proxy] /api/invoicetypes GET failed:', error);
    return NextResponse.json(
      { invoiceTypes: [], message: error.message || 'Failed to fetch invoice types' },
      { status: 500 }
    );
  }
}
