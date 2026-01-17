import { apiHelper } from 'src/utils/apiHelper';

import { CONFIG } from 'src/global-config';

import { VendorDetailsView } from 'src/sections/vendor/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Vendor details` };

export default async function Page({ params }) {
  const { id } = params;

  // Fetch all vendors from API
  const vendors = await apiHelper.getVendors();

  // Handle case where API returns undefined or null
  if (!vendors || !Array.isArray(vendors)) {
    return <div>Error loading vendors</div>;
  }

  // Find the specific vendor by id
  const currentVendor = vendors.find((vendor) => String(vendor.id) === id);

  if (!currentVendor) {
    return <div>Vendor not found</div>;
  }

  return <VendorDetailsView vendor={currentVendor} />;
}

// ----------------------------------------------------------------------

// export async function generateStaticParams() {
//   if (!CONFIG.isStaticExport) {
//    return [];
//   }
//
//   try {
//     // Fetch vendors from API for static generation
//     const vendors = await apiHelper.getVendors();
//
//     if (!vendors || !Array.isArray(vendors)) {
//       return [];
//     }
//
//     return vendors.map((vendor) => ({
//       id: vendor.id,
//     }));
//   } catch (error) {
//     console.error('Error generating static params:', error);
//     return [];
//   }
// }
