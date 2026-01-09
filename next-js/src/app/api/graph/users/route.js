import { NextResponse } from 'next/server';

const tokenEndpoint = (tenant) => `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

const graphUsersUrl =
  'https://graph.microsoft.com/v1.0/users?$select=id,displayName,mail,userPrincipalName&$top=50';

async function getAppToken() {
  const tenant = process.env.GRAPH_TENANT_ID;
  const clientId = process.env.GRAPH_CLIENT_ID;
  const clientSecret = process.env.GRAPH_CLIENT_SECRET;

  if (!tenant || !clientId || !clientSecret) {
    throw new Error('Graph credentials not set');
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
  });

  const res = await fetch(tokenEndpoint(tenant), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

export async function GET() {
  try {
    const token = await getAppToken();

    const res = await fetch(graphUsersUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { message: text || 'Failed to fetch users' },
        { status: res.status }
      );
    }

    const data = await res.json();
    const users = (data.value || []).map((u) => ({
      id: u.id,
      name: u.displayName || u.userPrincipalName || u.mail,
      email: u.mail || u.userPrincipalName,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Graph users error', error);
    return NextResponse.json({ message: error.message || 'Graph error' }, { status: 500 });
  }
}
