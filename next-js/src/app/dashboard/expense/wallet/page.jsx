import { apiHelper } from 'src/utils/apiHelper';

import WalletListWrapper from './list-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `Wallet Management` };

export default async function Page() {
  let wallets = [];

  try {
    wallets = await apiHelper.getWallets();
  } catch (error) {
    console.error('Failed to fetch wallets:', error);
    wallets = [];
  }

  return <WalletListWrapper wallets={wallets} />;
}
