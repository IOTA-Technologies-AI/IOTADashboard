import WalletDetailWrapper from './detail-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `Employee Wallet` };

export default async function Page({ params }) {
  const { employeeId } = await params;

  return <WalletDetailWrapper employeeId={employeeId} />;
}
