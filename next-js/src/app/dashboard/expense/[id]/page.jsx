import { apiHelper } from 'src/utils/apiHelper';

import { CONFIG } from 'src/global-config';

import { ExpenseDetailsView } from 'src/sections/expense/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Expense details | Dashboard - ${CONFIG.appName}` };

export default async function Page({ params }) {
  const { id } = params;

  // Fetch all expenses from API
  const expenses = await apiHelper.getExpenses();

  // Handle case where API returns undefined or null
  if (!expenses || !Array.isArray(expenses)) {
    return <div>Error loading expenses</div>;
  }

  // Find the specific expense by referenceId
  const currentExpense = expenses.find((expense) => expense.referenceId === id);

  if (!currentExpense) {
    return <div>Expense not found</div>;
  }

  return <ExpenseDetailsView expense={currentExpense} />;
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
