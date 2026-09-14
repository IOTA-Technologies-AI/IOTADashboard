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

// GET all nav permissions
export async function GET(request) {
  try {
    const res = await fetch(`${BASE_URL}/nav-permissions`, {
      method: 'GET',
      headers: buildHeaders(request),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Proxy] /api/nav-permissions GET failed:', error);
    return NextResponse.json(
      { permissions: [], message: error.message || 'Failed to fetch nav permissions' },
      { status: 500 }
    );
  }
}

// POST create new nav permission
export async function POST(request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BASE_URL}/nav-permissions`, {
      method: 'POST',
      headers: buildHeaders(request),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Proxy] /api/nav-permissions POST failed:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to create nav permission' },
      { status: 500 }
    );
  }
}
