'use client';

import { useState, useEffect } from 'react';

import { useParams, useRouter } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { apiHelper } from 'src/utils/apiHelper';

import { ExpenseEditView } from 'src/sections/expense/view';

export default function Page() {
  const { id } = useParams();
  const router = useRouter();
  const [expense, setExpense] = useState(null);

  useEffect(() => {
    if (!id) return;
    apiHelper
      .getExpenses()
      .then((expenses) => {
        if (!expenses || !Array.isArray(expenses)) {
          router.replace(paths.dashboard.expense.root);
          return;
        }
        const found = expenses.find((e) => e.referenceId === id);
        if (!found) router.replace(paths.dashboard.expense.root);
        else setExpense(found);
      })
      .catch(() => router.replace(paths.dashboard.expense.root));
  }, [id, router]);

  if (!expense) return null;
  return <ExpenseEditView expense={expense} />;
}

// ----------------------------------------------------------------------

// export async function generateStaticParams() {
//   if (!CONFIG.isStaticExport) {
//     return [];
//   }
//
//   try {
//     const expenses = await apiHelper.getExpenses();
//
//     if (!expenses || !Array.isArray(expenses)) {
//       return [];
//     }
//
//     return expenses.map((expense) => ({
//       id: expense.referenceId,
//     }));
//   } catch (error) {
//     console.error('Error generating static params:', error);
//     return [];
//   }
// }
