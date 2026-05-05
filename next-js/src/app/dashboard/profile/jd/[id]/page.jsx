import { JDDetailView } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const metadata = { title: 'Profile | Job Description' };

export default function Page({ params }) {
  return <JDDetailView id={params.id} />;
}
