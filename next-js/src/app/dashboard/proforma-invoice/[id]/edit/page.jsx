'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect } from 'react';

import { fetchProformaInvoice } from 'src/utils/apiHelper';

import { ProformaEditView } from 'src/sections/proforma-invoice/view';

import { PageGuard } from 'src/auth/guard';

export default function Page() {
  const { id } = useParams();
  const [proforma, setProforma] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetchProformaInvoice(id).then((data) => {
      if (data) setProforma(data);
    });
  }, [id]);

  return (
    <PageGuard>
      {proforma ? <ProformaEditView proforma={proforma} /> : null}
    </PageGuard>
  );
}
