import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { apiHelper } from 'src/utils/apiHelper';

import { CONFIG } from 'src/global-config';

import { VendorEditView } from 'src/sections/vendor/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Vendor edit` };

export default async function Page({ params }) {
  const { id } = await params;

  // Fetch all vendors from API
  const vendors = await apiHelper.getVendors();

  // Handle case where API returns undefined or null
  if (!vendors || !Array.isArray(vendors)) {
    redirect(paths.dashboard.vendor.root);
  }

  // Find the specific vendor by id - convert to string for comparison
  const currentVendor = vendors.find((vendor) => String(vendor.id) === id);

  // Redirect to list if vendor not found
  if (!currentVendor) {
    redirect(paths.dashboard.vendor.root);
  }

  return <VendorEditView vendor={currentVendor} />;
}

// ----------------------------------------------------------------------

// export async function generateStaticParams() {
//   if (!CONFIG.isStaticExport) {
//     return [];
//   }
//
//   try {
//     const vendors = await apiHelper.getVendors();
//
//     if (!vendors || !Array.isArray(vendors)) {
//       return [];
//     }
//
//     return vendors.map((vendor) => ({
//       id: String(vendor.id),
//     }));
//   } catch (error) {
//     console.error('Error generating static params:', error);
//     return [];
//   }
// }
