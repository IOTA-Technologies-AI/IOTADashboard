import { DealDetailsView } from 'src/sections/sales/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Sales | Deal Details` };

export default async function Page({ params }) {
  const { id } = await params;
  return <DealDetailsView id={id} />;
}
