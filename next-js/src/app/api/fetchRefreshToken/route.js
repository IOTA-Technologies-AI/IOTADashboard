export async function POST(req) {
  const { refreshToken } = await req.json();

  if (!refreshToken) {
    return new Response('Refresh token is required.', { status: 400 });
  }

  try {
    const newAccessToken = await fetchNewAccessToken(refreshToken);
    return new Response(JSON.stringify(newAccessToken), { status: 200 });
  } catch (error) {
    console.error('Error refreshing access token:', error);
    return new Response('Failed to refresh access token.', { status: 500 });
  }
}

async function fetchNewAccessToken(refreshToken) {
  const ZOHO_CLIENT_ID = '1000.0W66JK1NWH9MTGJ7D7LC8IHVZM2CTS';
  const ZOHO_CLIENT_SECRET = 'f283edb6fed8a9dab91c6a30de2c64a35252a9d167';

  try {
    const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh access token: ${response.statusText}`);
    }

    const data = await response.json();
    console.log('New Access Token Response:', data);
    return data;
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    throw error;
  }
}
