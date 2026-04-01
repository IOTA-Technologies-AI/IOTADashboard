import { apiHelper } from 'src/utils/apiHelper';

import WalletDetailWrapper from './detail-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `Employee Wallet` };

export default async function Page({ params }) {
  const { employeeId } = params;

  let wallet = null;
  let transactions = [];

  try {
    wallet = await apiHelper.getWallet(employeeId);
  } catch (error) {
    // Wallet doesn't exist yet — page will show empty state
    console.error('Wallet not found:', error.message);
  }

  if (wallet) {
    try {
      transactions = await apiHelper.getWalletTransactions(employeeId);
    } catch (error) {
      console.error('Failed to fetch transactions:', error.message);
      transactions = [];
    }
  }

  return (
    <WalletDetailWrapper employeeId={employeeId} wallet={wallet} transactions={transactions} />
  );
}
