import { NextResponse } from 'next/server';

import { normalizeApiHost } from 'src/utils/api-host';

import { CONFIG } from 'src/global-config';

const normalizeHost = normalizeApiHost;

const BASE_URL = normalizeHost(CONFIG.serverUrl);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = queryString
      ? `${BASE_URL}/onedrive/shared?${queryString}`
      : `${BASE_URL}/onedrive/shared`;

    const res = await fetch(url, {
      method: 'GET',
      // Forward the caller's session token: the API authenticates this endpoint.
      headers: { Authorization: request?.headers?.get('authorization') ?? '' },
    });

    const text = await res.text();

    if (!text) {
      return NextResponse.json({ value: [] }, { status: res.status });
    }

    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: res.status });
    } catch (parseError) {
      console.error('[Proxy] Failed to parse shared response:', text.substring(0, 200));
      return NextResponse.json(
        { message: 'Invalid JSON response from OneDrive API', value: [] },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[Proxy] /api/onedrive/shared GET failed:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to get shared OneDrive files' },
      { status: 500 }
    );
  }
}
