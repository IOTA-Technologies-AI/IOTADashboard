import { apiHelper } from 'src/utils/apiHelper';

import ExpenseListWrapper from './list-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `Expense list` };

export default async function Page() {
  let expenses = [];
  let permissionError = null;

  try {
    expenses = await apiHelper.getExpenses();
  } catch (error) {
    if (error.message && error.message.includes('PERMISSION_DENIED')) {
      permissionError = 'You do not have permission to view expenses';
    }
    expenses = [];
  }

  return <ExpenseListWrapper expenses={expenses} permissionError={permissionError} />;
}
