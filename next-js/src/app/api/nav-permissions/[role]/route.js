import { NextResponse } from 'next/server';

import { CONFIG } from 'src/global-config';

const normalizeHost = (url) =>
  (url || 'https://staging-iotaapiserver-s572.encr.app')
    .replace(/\/supabaseservices\/?$/, '')
    .replace(/\/$/, '');

const BASE_URL = normalizeHost(CONFIG.serverUrl);
const buildHeaders = (request) => ({
  'Content-Type': 'application/json',
  // Forward the caller's session token. The Encore API authenticates every
  // non-public endpoint at the gateway, so a proxy that drops the bearer
  // token gets a 401. The `apikey` header this replaces was a PostgREST
  // convention that Encore never read.
  Authorization: request?.headers?.get('authorization') ?? '',
});

// GET nav permissions for a specific role (returns allowed paths)
export async function GET(request, { params }) {
  try {
    const { role } = await params;
    const res = await fetch(`${BASE_URL}/nav-permissions/${role}`, {
      method: 'GET',
      headers: buildHeaders(request),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Proxy] /api/nav-permissions/[role] GET failed:', error);
    return NextResponse.json(
      { paths: [], message: error.message || 'Failed to fetch nav permissions for role' },
      { status: 500 }
    );
  }
}

// PATCH update nav permission by ID
export async function PATCH(request, { params }) {
  try {
    const { role: id } = await params;
    const body = await request.json();
    const res = await fetch(`${BASE_URL}/nav-permissions/update/${id}`, {
      method: 'PATCH',
      headers: buildHeaders(request),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Proxy] /api/nav-permissions/[role] PATCH failed:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update nav permission' },
      { status: 500 }
    );
  }
}
