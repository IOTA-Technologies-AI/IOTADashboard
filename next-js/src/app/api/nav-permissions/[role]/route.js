import { NextResponse } from 'next/server';

import { CONFIG } from 'src/global-config';

const normalizeHost = (url) =>
  (url || 'https://staging-iotaapiserver-s572.encr.app')
    .replace(/\/supabaseservices\/?$/, '')
    .replace(/\/$/, '');

const BASE_URL = normalizeHost(CONFIG.serverUrl);
const defaultHeaders = {
  'Content-Type': 'application/json',
  apikey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZianRwbHlmdnJuZ3Z0cXd5ZHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NTA3NDMsImV4cCI6MjA3NTQyNjc0M30.Jmj8g7US9gKA5vnbKuPmH9bsSRPX2JGLm_6zfSk45Sg',
};

// GET nav permissions for a specific role (returns allowed paths)
export async function GET(request, { params }) {
  try {
    const { role } = await params;
    const res = await fetch(`${BASE_URL}/nav-permissions/${role}`, {
      method: 'GET',
      headers: defaultHeaders,
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
    const res = await fetch(`${BASE_URL}/nav-permissions/${id}`, {
      method: 'PATCH',
      headers: defaultHeaders,
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
