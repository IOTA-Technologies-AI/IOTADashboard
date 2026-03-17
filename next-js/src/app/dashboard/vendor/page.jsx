import { apiHelper } from 'src/utils/apiHelper';

import VendorListWrapper from './list-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `Vendor list` };

export default async function Page() {
  let vendors = [];

  try {
    vendors = await apiHelper.getVendors();
  } catch (error) {
    vendors = [];
  }

  return <VendorListWrapper vendors={vendors} />;
}
