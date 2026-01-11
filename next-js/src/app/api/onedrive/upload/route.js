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

    // Get raw text first to handle empty responses
    const text = await res.text();

    if (!text) {
      if (res.ok) {
        return NextResponse.json({ success: true }, { status: res.status });
      }
      return NextResponse.json(
        { message: 'Empty response from OneDrive API' },
        { status: res.status || 500 }
      );
    }

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: res.status });
    } catch (parseError) {
      console.error('[Proxy] Failed to parse upload response:', text.substring(0, 500));
      return NextResponse.json(
        { message: text || 'Invalid response from OneDrive API' },
        { status: res.status || 500 }
      );
    }
  } catch (error) {
    console.error('[Proxy] /api/onedrive/upload POST failed:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to upload to OneDrive' },
      { status: 500 }
    );
  }
}
