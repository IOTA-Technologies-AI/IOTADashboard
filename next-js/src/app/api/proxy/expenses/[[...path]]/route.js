import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app';
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

const buildHeaders = (request) => {
  const headers = {};
  const contentType = request.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  if (SERVICE_ROLE_KEY) {
    headers.apikey = SERVICE_ROLE_KEY;
    headers.Authorization = `Bearer ${SERVICE_ROLE_KEY}`;
  }

  return headers;
};

const buildUrl = (pathSegments = [], search = '') => {
  const path =
    Array.isArray(pathSegments) && pathSegments.length ? `/${pathSegments.join('/')}` : '';
  return `${API_BASE_URL}/expenses${path}${search}`;
};

const proxy = async (method, request, { params }) => {
  const search = new URL(request.url).search || '';
  const upstreamUrl = buildUrl(params?.path, search);
  const init = {
    method,
    headers: buildHeaders(request),
    cache: 'no-store',
  };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await request.text();
  }

  let upstreamResponse;
  try {
    upstreamResponse = await fetch(upstreamUrl, init);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Upstream request failed' },
      { status: 500 }
    );
  }

  const contentType = upstreamResponse.headers.get('content-type') || '';
  const rawBody = await upstreamResponse.text();

  let parsedBody = rawBody;
  if (contentType.includes('application/json') && rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch (error) {
      parsedBody = rawBody;
    }
  }

  if (!upstreamResponse.ok) {
    const message = typeof parsedBody === 'string' ? parsedBody : parsedBody?.error || parsedBody;
    return NextResponse.json(
      { error: message || 'Proxy request failed' },
      { status: upstreamResponse.status }
    );
  }

  if (contentType.includes('application/json')) {
    return NextResponse.json(parsedBody, { status: upstreamResponse.status });
  }

  return new NextResponse(parsedBody, {
    status: upstreamResponse.status,
    headers: { 'Content-Type': contentType || 'text/plain' },
  });
};

export async function GET(request, context) {
  return proxy('GET', request, context);
}

export async function POST(request, context) {
  return proxy('POST', request, context);
}

export async function PATCH(request, context) {
  return proxy('PATCH', request, context);
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
