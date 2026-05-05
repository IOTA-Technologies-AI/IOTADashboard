import { CandidateDetailView } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const metadata = { title: 'Profile | Candidate' };

export default function Page({ params }) {
  return <CandidateDetailView id={params.id} />;
}
