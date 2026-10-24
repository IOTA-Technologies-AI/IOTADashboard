import { redirect } from 'next/navigation';

// ----------------------------------------------------------------------

/**
 * Candidates sign offers on docs.iotatechnologies.io, behind an emailed code;
 * the dashboard is not a public host. Links sent before the move land here and
 * are forwarded with the same token.
 */
export default async function OfferSignRedirect({ params }) {
  const { token } = await params;
  redirect(`https://docs.iotatechnologies.io/offer/${encodeURIComponent(token)}`);
}
