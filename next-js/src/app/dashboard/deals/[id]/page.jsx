'use client';

import { useState, useEffect } from 'react';

import { useParams, notFound } from 'next/navigation';

import { getDeal } from 'src/actions/deals';

import { DealDetailsView } from 'src/sections/deals/view/deal-details-view';

export default function Page() {
  const { id } = useParams();
  const [deal, setDeal] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!id) return;
    getDeal(id)
      .then((data) => {
        if (!data) setMissing(true);
        else setDeal(data);
      })
      .catch(() => setMissing(true));
  }, [id]);

  if (missing) notFound();
  if (!deal) return null;
  return <DealDetailsView deal={deal} />;
}
