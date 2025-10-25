import { NextResponse } from 'next/server';

export async function GET(request) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/file?error=${error}`, request.url));
  }

  if (code) {
    return NextResponse.redirect(new URL(`/dashboard/file?code=${code}`, request.url));
  }

  return NextResponse.redirect(new URL('/dashboard/file', request.url));
}
