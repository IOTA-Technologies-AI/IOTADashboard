import { PhoneSignView } from './phone-sign-view';

// ----------------------------------------------------------------------

// The capture token is in this page's URL: never send it on in a Referer.
export const metadata = {
  title: 'Sign on your phone | IOTA Technologies',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default async function Page({ params }) {
  const { token } = await params;
  return <PhoneSignView token={token} />;
}
