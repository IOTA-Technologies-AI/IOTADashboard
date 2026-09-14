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

export async function POST(request) {
  try {
    const body = await request.json();

    const res = await fetch(`${BASE_URL}/onedrive/refresh`, {
      method: 'POST',
      headers: buildHeaders(request),
      body: JSON.stringify(body),
    });

    const text = await res.text();

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error('[Proxy] Failed to parse response:', e);
      data = { raw: text };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Proxy] /api/onedrive/refresh POST failed:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to refresh OneDrive token' },
      { status: 500 }
    );
  }
}
