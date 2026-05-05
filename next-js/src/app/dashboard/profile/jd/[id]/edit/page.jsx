import { JDNewEditForm } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const metadata = { title: 'Profile | Edit Job Description' };

export default function Page({ params }) {
  return <JDNewEditForm id={params.id} />;
}
