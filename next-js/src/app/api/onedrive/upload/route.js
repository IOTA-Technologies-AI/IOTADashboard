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

    const res = await fetch(`${BASE_URL}/onedrive/upload`, {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(body),
    });

    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Proxy] /api/onedrive/upload POST failed:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to upload to OneDrive' },
      { status: 500 }
    );
  }
}
