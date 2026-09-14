import { NextResponse } from 'next/server';

import { CONFIG } from 'src/global-config';

// Read-only proxy over the adminEditAuditLog table. The log is append-only and
// is written server-side inside the invoice/expense PATCH endpoints, so there
// is deliberately no write route here.

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
    const { searchParams } = new URL(request.url);
    const params = searchParams.toString();
    const url = params ? `${BASE_URL}/admin/edit-audit?${params}` : `${BASE_URL}/admin/edit-audit`;
    const res = await fetch(url, { headers: buildHeaders(request), cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Proxy /api/admin/edit-audit GET failed', error);
    return NextResponse.json({ entries: [], message: 'Failed to read audit log' }, { status: 500 });
  }
}
