import IssueDetailsWrapper from './details-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `Issue` };

export default async function Page({ params }) {
  const { id } = await params;
  return <IssueDetailsWrapper id={id} />;
}
