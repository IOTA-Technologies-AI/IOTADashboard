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
      ? `${BASE_URL}/onedrive/search?${queryString}`
      : `${BASE_URL}/onedrive/search`;

    const res = await fetch(url, {
      method: 'GET',
      // Forward the caller's session token: the API authenticates this endpoint.
      headers: { Authorization: request?.headers?.get('authorization') ?? '' },
    });
    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Proxy] /api/onedrive/search GET failed:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to search OneDrive' },
      { status: 500 }
    );
  }
}
