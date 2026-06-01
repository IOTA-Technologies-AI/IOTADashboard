'use client';

import { useState, useEffect } from 'react';

import { useParams, notFound } from 'next/navigation';

import { getCommission } from 'src/actions/commission';

import { CommissionDetailsView } from 'src/sections/commission/view/commission-details-view';

export default function Page() {
  const { id } = useParams();
  const [commission, setCommission] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    getCommission(id)
      .then((data) => {
        if (!data) setMissing(true);
        else setCommission(data);
      })
      .catch(() => setMissing(true));
  }, [id]);

  if (missing) notFound();
  if (!commission) return null;
  return <CommissionDetailsView commission={commission} />;
}
