import JobLoader from './job-loader';

// ----------------------------------------------------------------------

export const metadata = { title: `Job details` };

export default async function Page({ params }) {
  const { id } = await params;

  return <JobLoader id={id} mode="details" />;
}
