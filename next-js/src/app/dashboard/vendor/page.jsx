'use client';

import { useState, useEffect } from 'react';

import { apiHelper } from 'src/utils/apiHelper';

import VendorListWrapper from './list-wrapper';

export default function Page() {
  const [vendors, setVendors] = useState([]);

  useEffect(() => {
    apiHelper
      .getVendors()
      .then((data) => setVendors(data || []))
      .catch(() => setVendors([]));
  }, []);

  return <VendorListWrapper vendors={vendors} />;
}
