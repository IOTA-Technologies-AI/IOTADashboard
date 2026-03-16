/**
 * Universal Encore API proxy.
 *
 * All browser-side calls to https://staging-iotaapiserver-s572.encr.app/* are re-written
 * to /api/proxy/* by the axiosInstance interceptor (lib/axios.js).  This proxy
 * runs server-side so there is no CORS issue, and it forwards the user's JWT
 * from the incoming Authorization header straight through to Encore.
 *
 * Route: /api/proxy/[...path]
 * Proxies: GET, POST, PATCH, PUT, DELETE
 */

import { NextResponse } from 'next/server';

import { CONFIG } from 'src/global-config';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const normalizeHost = (url) =>
  (url || 'https://staging-iotaapiserver-s572.encr.app')
    .replace(/\/supabaseservices\/?$/, '')
    .replace(/\/$/, '');

const BASE_URL = normalizeHost(CONFIG.serverUrl);

const getHeaders = (request) => {
  const h = { 'Content-Type': 'application/json' };

  // Preserve the incoming content-type (e.g. multipart/form-data)
  const ct = request?.headers?.get?.('content-type');
  if (ct) h['Content-Type'] = ct;

  // Forward the user's JWT so Encore auth middleware can verify it
  const auth = request?.headers?.get?.('authorization');
  if (auth) h.Authorization = auth;

  return h;
};

// ---------------------------------------------------------------------------
// Core proxy handler
// ---------------------------------------------------------------------------

async function proxy(method, request, context) {
  const pathSegments = (await context?.params)?.path ?? [];
  const pathStr = pathSegments.length ? `/${pathSegments.join('/')}` : '';
  const search = new URL(request.url).search || '';
  const upstreamUrl = `${BASE_URL}${pathStr}${search}`;

  const init = { method, headers: getHeaders(request), cache: 'no-store' };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await request.text();
  }

  let upstreamRes;
  try {
    upstreamRes = await fetch(upstreamUrl, init);
  } catch (err) {
    console.error('[proxy] upstream fetch error:', upstreamUrl, err?.message);
    return NextResponse.json({ error: err?.message || 'Upstream request failed' }, { status: 502 });
  }

  const contentType = upstreamRes.headers.get('content-type') || '';
  const rawBody = await upstreamRes.text();

  if (contentType.includes('application/json') && rawBody) {
    let parsed;
    try {
      parsed = JSON.parse(rawBody);
    } catch {
      parsed = rawBody;
    }
    return NextResponse.json(parsed, { status: upstreamRes.status });
  }

  return new NextResponse(rawBody, {
    status: upstreamRes.status,
    headers: { 'Content-Type': contentType || 'text/plain' },
  });
}

// ---------------------------------------------------------------------------
// HTTP method exports
// ---------------------------------------------------------------------------

export async function GET(request, context) {
  return proxy('GET', request, context);
}

export async function POST(request, context) {
  return proxy('POST', request, context);
}

export async function PATCH(request, context) {
  return proxy('PATCH', request, context);
}

export async function PUT(request, context) {
  return proxy('PUT', request, context);
}

export async function DELETE(request, context) {
  return proxy('DELETE', request, context);
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
