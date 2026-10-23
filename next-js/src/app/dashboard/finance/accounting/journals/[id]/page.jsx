import JournalDetailsWrapper from './view-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: 'Journal | Accounting' };

export default async function Page({ params }) {
  const { id } = await params;
  return <JournalDetailsWrapper id={id} />;
}
