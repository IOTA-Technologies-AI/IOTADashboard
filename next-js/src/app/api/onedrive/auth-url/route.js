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
      ? `${BASE_URL}/onedrive/auth-url?${queryString}`
      : `${BASE_URL}/onedrive/auth-url`;

    const res = await fetch(url, {
      method: 'GET',
      // Forward the caller's session token: the API authenticates this endpoint.
      headers: { Authorization: request?.headers?.get('authorization') ?? '' },
    });
    const text = await res.text();

    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      // If it's a plain URL string, return it as-is
      data = { url: text };
    }

    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Proxy] /api/onedrive/auth-url GET failed:', error);
    return NextResponse.json(
      { message: error.message || 'Failed to get OneDrive auth URL' },
      { status: 500 }
    );
  }
}
