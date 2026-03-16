'use client';

import { useState, useEffect } from 'react';

import { useParams } from 'next/navigation';

import { apiHelper } from 'src/utils/apiHelper';

import { ExpenseDetailsView } from 'src/sections/expense/view';

export default function Page() {
  const { id } = useParams();
  const [expense, setExpense] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    apiHelper
      .getExpenses()
      .then((expenses) => {
        if (!expenses || !Array.isArray(expenses)) {
          setError('Error loading expenses');
          return;
        }
        const found = expenses.find((e) => e.referenceId === id);
        if (!found) setError('Expense not found');
        else setExpense(found);
      })
      .catch(() => setError('Error loading expenses'));
  }, [id]);

  if (error) return <div>{error}</div>;
  if (!expense) return null;
  return <ExpenseDetailsView expense={expense} />;
}

// ----------------------------------------------------------------------

// export async function generateStaticParams() {
//   if (!CONFIG.isStaticExport) {
//     return [];
//   }
//
//   try {
//     // Fetch expenses from API for static generation
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
