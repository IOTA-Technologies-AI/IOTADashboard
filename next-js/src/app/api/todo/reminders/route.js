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

export async function GET(request) {
  const { searchParams } = request.nextUrl;
  const taskId = searchParams.get('taskId');

  if (!taskId) {
    return NextResponse.json({ message: 'taskId is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`${BASE_URL}/todo/reminders?taskId=${encodeURIComponent(taskId)}`, {
      headers: buildHeaders(request),
      cache: 'no-store',
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Proxy /api/todo/reminders failed', error);
    return NextResponse.json({ message: 'Failed to fetch reminders' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BASE_URL}/todo/reminders`, {
      method: 'POST',
      headers: buildHeaders(request),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Proxy /api/todo/reminders POST failed', error);
    return NextResponse.json({ message: 'Failed to create reminder' }, { status: 500 });
  }
}
