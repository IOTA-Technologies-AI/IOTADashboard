'use client';

import { useState, useEffect } from 'react';

import { getDeals } from 'src/actions/deals';

import { DealListView } from 'src/sections/deals/view/deal-list-view';

export default function Page() {
  const [deals, setDeals] = useState([]);

  useEffect(() => {
    getDeals()
      .then((data) => setDeals(data || []))
      .catch(() => setDeals([]));
  }, []);

  return <DealListView deals={deals} />;
}
