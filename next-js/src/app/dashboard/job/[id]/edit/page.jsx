import JobLoader from '../job-loader';

// ----------------------------------------------------------------------

export const metadata = { title: `Job edit` };

export default async function Page({ params }) {
  const { id } = await params;

  return <JobLoader id={id} mode="edit" />;
}
