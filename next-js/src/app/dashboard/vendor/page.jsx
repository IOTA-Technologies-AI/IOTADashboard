import { apiHelper } from 'src/utils/apiHelper';

import { CONFIG } from 'src/global-config';

import VendorListWrapper from './list-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `Vendor list` };

export default async function Page() {
  let vendors = [];

  try {
    console.log('📄 Fetching vendors from API...');
    vendors = await apiHelper.getVendors();
    console.log('📄 Fetched vendors:', vendors?.length || 0);
  } catch (error) {
    console.error('📄 Error fetching vendors:', error);
    vendors = [];
  }

  return <VendorListWrapper vendors={vendors} />;
}
