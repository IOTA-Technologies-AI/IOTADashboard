import { apiHelper } from 'src/utils/apiHelper';

import { CONFIG } from 'src/global-config';

import { ExpenseListView } from 'src/sections/expense/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Expense list | Dashboard - ${CONFIG.appName}` };

export default async function Page() {
  let expenses = [];

  try {
    console.log('📄 Fetching expenses from API...');
    expenses = await apiHelper.getExpenses();
    console.log('📄 Fetched expenses:', expenses?.length || 0);
  } catch (error) {
    console.error('📄 Error fetching expenses:', error);
    expenses = [];
  }

  return <ExpenseListView expenses={expenses} />;
}
