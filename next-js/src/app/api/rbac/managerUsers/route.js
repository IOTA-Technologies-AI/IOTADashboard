import { NextResponse } from 'next/server';

const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app';
const API_KEY = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
const AUTH_TOKEN = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  ? `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY}`
  : undefined;

const buildHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers.apikey = API_KEY;
  if (AUTH_TOKEN) headers.Authorization = AUTH_TOKEN;
  return headers;
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const managerId = searchParams.get('managerId');
  if (!managerId) {
    return NextResponse.json({ error: 'managerId required' }, { status: 400 });
  }

  const url = `${API_BASE_URL}/managerUsers?managerId=eq.${encodeURIComponent(managerId)}`;
  try {
    const res = await fetch(url, { headers: buildHeaders(), cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to fetch manager users' },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Fetch failed' }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await request.json();
  const { managerId, userId } = body || {};
  if (!managerId || !userId) {
    return NextResponse.json({ error: 'managerId and userId are required' }, { status: 400 });
  }

  const url = `${API_BASE_URL}/managerUsers`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { ...buildHeaders(), Prefer: 'return=representation' },
      body: JSON.stringify({ managerId, userId }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || 'Failed to assign manager' },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Request failed' }, { status: 500 });
  }
}
