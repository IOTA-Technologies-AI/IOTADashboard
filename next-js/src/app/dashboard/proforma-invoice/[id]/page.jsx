'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { fetchProformaInvoice } from 'src/utils/apiHelper';

import { ProformaDetailsView } from 'src/sections/proforma-invoice/view';

export default function Page() {
  const { id } = useParams();
  const [proforma, setProforma] = useState(null);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await fetchProformaInvoice(id);
    if (data) setProforma(data);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (!proforma) return null;
  return <ProformaDetailsView proforma={proforma} onRefresh={load} />;
}
