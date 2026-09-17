import VettingDetailsWrapper from './details-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `Employee Vetting Details` };

export default async function Page({ params }) {
  const { id } = await params;
  return <VettingDetailsWrapper id={id} />;
}
