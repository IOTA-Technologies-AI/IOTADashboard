'use client';

import { useState, useEffect } from 'react';
import { notFound, useParams } from 'next/navigation';

import { getBDM } from 'src/actions/bdm';
import { getDeals } from 'src/actions/deals';

import { BDMProfileView } from 'src/sections/bdm/view/bdm-profile-view';

export default function Page() {
  const { id } = useParams();
  const [bdm, setBdm] = useState(null);
  const [bdmDeals, setBdmDeals] = useState([]);
  const [notFoundFlag, setNotFoundFlag] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([getBDM(id), getDeals()]).then(([bdmData, deals]) => {
      if (!bdmData) {
        setNotFoundFlag(true);
        return;
      }
      setBdm(bdmData);
      setBdmDeals((deals || []).filter((deal) => String(deal.bdmId) === String(id)));
    });
  }, [id]);

  if (notFoundFlag) {
    notFound();
  }

  if (!bdm) return null;

  return <BDMProfileView bdm={bdm} deals={bdmDeals} />;
}
