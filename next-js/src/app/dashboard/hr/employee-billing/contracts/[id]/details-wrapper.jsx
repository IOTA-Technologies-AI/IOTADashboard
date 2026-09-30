'use client';

import { useParams } from 'next/navigation';

import { ContractDetailsView } from 'src/sections/employee-billing/view';

import { PageGuard } from 'src/auth/guard';

export default function ContractDetailsWrapper() {
  const { id } = useParams();
  return (
    <PageGuard>
      <ContractDetailsView id={id} />
    </PageGuard>
  );
}
