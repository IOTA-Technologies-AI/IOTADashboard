export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const authorizationCode = searchParams.get('code');

  if (!authorizationCode) {
    return new Response('Authorization code not found.', { status: 400 });
  }

  try {
    const tokenResponse = await fetchAccessToken(authorizationCode);
    return new Response(JSON.stringify(tokenResponse), { status: 200 });
  } catch (error) {
    console.error('Error fetching access token:', error);
    return new Response('Failed to exchange authorization code.', { status: 500 });
  }
}

async function fetchAccessToken(code) {
  const ZOHO_CLIENT_ID = process.env.ZOHO_CLIENT_ID;
  const ZOHO_CLIENT_SECRET = process.env.ZOHO_CLIENT_SECRET;
  const REDIRECT_URI = 'http://localhost:3000/api/fetchAuthorizationToken';

  try {
    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange authorization code: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Access Token Response:', data);
    return data;
  } catch (error) {
    console.error('Failed to exchange authorization code:', error);
    throw error;
  }
}
