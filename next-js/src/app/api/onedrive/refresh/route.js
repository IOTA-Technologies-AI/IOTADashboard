import { NextResponse } from 'next/server';

import { CONFIG } from 'src/global-config';

const normalizeHost = (url) =>
  (url || 'https://staging-iotaapiserver-s572.encr.app')
    .replace(/\/supabaseservices\/?$/, '')
    .replace(/\/$/, '');

const BASE_URL = normalizeHost(CONFIG.serverUrl);
const defaultHeaders = {
  'Content-Type': 'application/json',
};

export async function POST(request) {
  try {
    const body = await request.json();
    console.log('[Proxy] OneDrive refresh request:', {
      hasRefreshToken: !!body.refreshToken,
      hasRedirectUri: !!body.redirectUri,
    });

    const res = await fetch(`${BASE_URL}/onedrive/refresh`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log('[Proxy] OneDrive refresh response status:', res.status);
    console.log('[Proxy] OneDrive refresh response text:', text);

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
