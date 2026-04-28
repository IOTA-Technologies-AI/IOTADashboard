'use client';

import { useSearchParams } from 'next/navigation';
import { DealNewEditForm } from 'src/sections/sales/view';

// ----------------------------------------------------------------------

export default function Page() {
  const searchParams = useSearchParams();
  const defaultStage = searchParams.get('stage') || 'lead';

  return <DealNewEditForm defaultStage={defaultStage} />;
}
