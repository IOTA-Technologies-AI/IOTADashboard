export async function GET(req) {
  const ZOHO_API_BASE_URL = 'https://www.zohoapis.com/invoice/v3';
  const ZOHO_ACCESS_TOKEN =
    '1000.7f6e545d507807a14170528c69bb3c06.8337096eb8f8f25ff472d5ce39691638';
  const ZOHO_ORGANIZATION_ID = '895049318';

  try {
    const response = await fetch(`${ZOHO_API_BASE_URL}/invoices`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${ZOHO_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'X-com-zoho-invoice-organizationid': ZOHO_ORGANIZATION_ID,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Zoho invoices: ${response.statusText}`);
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), { status: 200 });
  } catch (error) {
    console.error('Failed to fetch Zoho invoices:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
