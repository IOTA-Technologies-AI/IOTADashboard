import VendorListWrapper from './list-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `Vendor list` };

// No data fetching here — see the note in VendorListView. A server component
// cannot obtain a bearer token, so this fetch returned 401 and the catch turned
// it into an empty list with nothing shown to the user.
export default function Page() {
  return <VendorListWrapper />;
}
