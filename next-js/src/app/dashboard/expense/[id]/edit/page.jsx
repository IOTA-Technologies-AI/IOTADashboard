import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { apiHelper } from 'src/utils/apiHelper';

import { CONFIG } from 'src/global-config';

import { ExpenseEditView } from 'src/sections/expense/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Expense edit` };

export default async function Page({ params }) {
  const { id } = await params;

  // Fetch all expenses from API
  const expenses = await apiHelper.getExpenses();

  // Handle case where API returns undefined or null
  if (!expenses || !Array.isArray(expenses)) {
    redirect(paths.dashboard.expense.root);
  }

  // Find the specific expense by referenceId
  const currentExpense = expenses.find((expense) => expense.referenceId === id);

  // Redirect to list if expense not found
  if (!currentExpense) {
    redirect(paths.dashboard.expense.root);
  }

  return <ExpenseEditView expense={currentExpense} />;
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
