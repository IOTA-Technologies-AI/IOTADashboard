import { NextResponse } from 'next/server';

import { normalizeApiHost } from 'src/utils/api-host';

import { CONFIG } from 'src/global-config';

const normalizeHost = normalizeApiHost;

const BASE_URL = normalizeHost(CONFIG.serverUrl);

export async function GET(request, { params }) {
  try {
    const { itemId } = await params;
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const url = queryString
      ? `${BASE_URL}/onedrive/items/${itemId}?${queryString}`
      : `${BASE_URL}/onedrive/items/${itemId}`;

    const res = await fetch(url, {
      method: 'GET',
      // Forward the caller's session token: the API authenticates this endpoint.
      headers: { Authorization: request?.headers?.get('authorization') ?? '' },
    });
    const data = await res.json();

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Proxy] /api/onedrive/items/[itemId] GET failed:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to get OneDrive item' },
      { status: 500 }
    );
  }
}
