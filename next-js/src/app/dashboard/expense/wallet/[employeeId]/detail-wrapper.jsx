'use client';

import useSWR from 'swr';

import { apiHelper } from 'src/utils/apiHelper';

import { LoadingScreen } from 'src/components/loading-screen';

import { WalletDetailView } from 'src/sections/expense/wallet';

import { PageGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

// Fetched client-side: the API needs the signed-in user's bearer token, which only
// exists in the browser session — a server component has none and gets 401.
async function loadWallet(employeeId) {
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

  return { wallet, transactions };
}

export default function WalletDetailWrapper({ employeeId }) {
  const { data, isLoading } = useSWR(
    employeeId ? ['wallet-detail', employeeId] : null,
    () => loadWallet(employeeId),
    { revalidateOnFocus: false }
  );

  return (
    <PageGuard>
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <WalletDetailView
          employeeId={employeeId}
          wallet={data?.wallet || null}
          transactions={data?.transactions || []}
        />
      )}
    </PageGuard>
  );
}
