import WalletListWrapper from './list-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `Wallet Management` };

// No data fetching here — see the note in WalletListView. A server component
// cannot obtain a bearer token, so this fetch returned 401 and the catch turned
// it into an empty wallet list.
export default function Page() {
  return <WalletListWrapper />;
}
