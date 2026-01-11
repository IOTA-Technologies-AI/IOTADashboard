import { NextResponse } from 'next/server';

import { CONFIG } from 'src/global-config';

// Increase body size limit for file uploads (default is 1MB in App Router)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
    responseLimit: false,
  },
};

// For App Router, also export this to increase body size
export const maxDuration = 60; // 60 seconds timeout

const normalizeHost = (url) =>
  (url || 'https://staging-iotaapiserver-s572.encr.app')
    .replace(/\/supabaseservices\/?$/, '')
    .replace(/\/$/, '');

const BASE_URL = normalizeHost(CONFIG.serverUrl);
const defaultHeaders = {
  'Content-Type': 'application/json',
};

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch (parseError) {
    console.error('[Proxy] Failed to parse request body:', parseError);
    return NextResponse.json({ message: 'Invalid request body' }, { status: 400 });
  }

  try {
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
    } catch (jsonError) {
      // If text is HTML error page or non-JSON, return it as message
      console.error('[Proxy] Failed to parse upload response as JSON');
      if (res.ok) {
        // Backend returned 200 but non-JSON response - treat as success
        return NextResponse.json({ success: true, raw: text.substring(0, 100) }, { status: 200 });
      }
      return NextResponse.json(
        { message: text.substring(0, 500) || 'Invalid response from OneDrive API' },
        { status: res.status || 500 }
      );
    }
  } catch (error) {
    console.error('[Proxy] /api/onedrive/upload POST failed:', error.message || error);
    return NextResponse.json(
      { message: error.message || 'Failed to upload to OneDrive' },
      { status: 500 }
    );
  }
}
