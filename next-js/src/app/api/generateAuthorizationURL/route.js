export async function GET() {
  const ZOHO_CLIENT_ID = '1000.0W66JK1NWH9MTGJ7D7LC8IHVZM2CTS';
  const REDIRECT_URI = 'http://localhost:3000/api/fetchAuthorizationToken';
  const SCOPE =
    'ZohoInvoice.invoices.CREATE,ZohoInvoice.invoices.READ,ZohoInvoice.invoices.UPDATE,ZohoInvoice.invoices.DELETE';

  const authUrl = `https://accounts.zoho.com/oauth/v2/auth?scope=${encodeURIComponent(SCOPE)}&client_id=${ZOHO_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&access_type=offline&prompt=consent`;

  return new Response(JSON.stringify({ authUrl }), { status: 200 });
}
