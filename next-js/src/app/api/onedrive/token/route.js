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

    const res = await fetch(`${BASE_URL}/onedrive/token`, {
      method: 'POST',
      headers: defaultHeaders,
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
    console.error('[Proxy] /api/onedrive/token POST failed:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to exchange OneDrive token' },
      { status: 500 }
    );
  }
}
