import iotaApi from 'src/lib/iota-api';

/**
 * Publishes every staged CMS item on the IOTA Webflow site.
 *
 * Throws an Error carrying the API's own message, so the toast says why it
 * failed — a refused sign-in ("second factor required", "invalid or expired
 * token") reads differently from Webflow rejecting the saved API key.
 */
export async function publishToWebflow() {
  let response;
  try {
    response = await iotaApi.post('/webflow/publish', {});
  } catch (error) {
    const status = error?.response?.status;
    const apiMessage = error?.response?.data?.message;
    console.error('Error publishing to Webflow:', status, error?.response?.data || error);
    throw new Error(
      status === 401
        ? `Your sign-in was refused by the API (${apiMessage || 'unauthenticated'}). Reload the page; if it persists, sign out and in again.`
        : apiMessage || error.message || 'Failed to publish to Webflow'
    );
  }

  if (!response.data?.success) {
    // Webflow itself refused — usually the saved API key or site ID.
    const message = response.data?.message || 'Failed to publish to Webflow';
    console.error('Webflow publish failed:', message);
    throw new Error(`Webflow refused the publish: ${message}`);
  }
  return response.data;
}
