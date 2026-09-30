'use client';

import { useParams } from 'next/navigation';

import { ContractFormView } from 'src/sections/employee-billing/view';

import { PageGuard } from 'src/auth/guard';

export default function ContractEditWrapper() {
  const { id } = useParams();
  return (
    <PageGuard>
      <ContractFormView id={id} />
    </PageGuard>
  );
}
