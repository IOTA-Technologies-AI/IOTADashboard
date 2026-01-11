import { NextResponse } from 'next/server';

import { CONFIG } from 'src/global-config';

const normalizeHost = (url) =>
  (url || 'https://staging-iotaapiserver-s572.encr.app')
    .replace(/\/supabaseservices\/?$/, '')
    .replace(/\/$/, '');

const BASE_URL = normalizeHost(CONFIG.serverUrl);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = queryString
      ? `${BASE_URL}/onedrive/files?${queryString}`
      : `${BASE_URL}/onedrive/files`;

    const res = await fetch(url, { method: 'GET' });

    // Get raw text first to handle empty responses
    const text = await res.text();

    if (!text) {
      return NextResponse.json({ value: [] }, { status: res.status });
    }

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: res.status });
    } catch (parseError) {
      console.error('[Proxy] Failed to parse response:', text.substring(0, 200));
      return NextResponse.json(
        { message: 'Invalid JSON response from OneDrive API', value: [] },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Proxy] /api/onedrive/files GET failed:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to get OneDrive files' },
      { status: 500 }
    );
  }
}
