'use client';

import { useState, useEffect } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { apiHelper } from 'src/utils/apiHelper';

import { VendorEditView } from 'src/sections/vendor/view';

export default function Page() {
  const { id } = useParams();
  const router = useRouter();
  const [vendor, setVendor] = useState(null);

  useEffect(() => {
    if (!id) return;
    apiHelper
      .getVendors()
      .then((vendors) => {
        if (!vendors || !Array.isArray(vendors)) {
          router.replace(paths.dashboard.vendor.root);
          return;
        }
        const found = vendors.find((v) => String(v.id) === id);
        if (!found) router.replace(paths.dashboard.vendor.root);
        else setVendor(found);
      })
      .catch(() => router.replace(paths.dashboard.vendor.root));
  }, [id, router]);

  if (!vendor) return null;
  return <VendorEditView vendor={vendor} />;
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
