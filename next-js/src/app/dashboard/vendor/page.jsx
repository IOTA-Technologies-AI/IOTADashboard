import { apiHelper } from 'src/utils/apiHelper';

import { CONFIG } from 'src/global-config';

import { VendorListView } from 'src/sections/vendor/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Vendor list | Dashboard - ${CONFIG.appName}` };

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

  return <VendorListView vendors={vendors} />;
}
