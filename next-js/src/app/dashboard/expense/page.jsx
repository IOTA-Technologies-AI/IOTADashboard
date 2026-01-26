import { apiHelper } from 'src/utils/apiHelper';

import ExpenseListWrapper from './list-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `Expense list` };

export default async function Page() {
  let expenses = [];
  let permissionError = null;

  try {
    console.log('📄 Fetching expenses from API...');
    expenses = await apiHelper.getExpenses();
    console.log('📄 Fetched expenses:', expenses?.length || 0);
  } catch (error) {
    console.error('📄 Error fetching expenses:', error);

    // Check if it's a permission error
    if (error.message && error.message.includes('PERMISSION_DENIED')) {
      console.error('🔒 Permission denied - user cannot view expenses');
      permissionError = 'You do not have permission to view expenses';
      expenses = [];
    } else {
      // For other errors, return empty array
      console.error('❌ Failed to fetch expenses:', error.message);
      expenses = [];
    }
  }

  return <ExpenseListWrapper expenses={expenses} permissionError={permissionError} />;
}
