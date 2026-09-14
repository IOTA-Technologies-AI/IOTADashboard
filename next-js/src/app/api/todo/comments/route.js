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
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const url = taskId ? `${BASE_URL}/todo/comments?taskId=${taskId}` : `${BASE_URL}/todo/comments`;
    const res = await fetch(url, { method: 'GET', headers: buildHeaders(request) });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Proxy /api/todo/comments GET failed', error);
    return NextResponse.json({ message: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BASE_URL}/todo/comments`, {
      method: 'POST',
      headers: buildHeaders(request),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Proxy /api/todo/comments POST failed', error);
    return NextResponse.json({ message: 'Failed to create comment' }, { status: 500 });
  }
}
