'use client';

import { useState, useEffect } from 'react';

import { useParams } from 'next/navigation';

import { apiHelper } from 'src/utils/apiHelper';

import { VendorDetailsView } from 'src/sections/vendor/view';

export default function Page() {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    apiHelper
      .getVendors()
      .then((vendors) => {
        if (!vendors || !Array.isArray(vendors)) {
          setError('Error loading vendors');
          return;
        }
        const found = vendors.find((v) => String(v.id) === id);
        if (!found) setError('Vendor not found');
        else setVendor(found);
      })
      .catch(() => setError('Error loading vendors'));
  }, [id]);

  if (error) return <div>{error}</div>;
  if (!vendor) return null;
  return <VendorDetailsView vendor={vendor} />;
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
