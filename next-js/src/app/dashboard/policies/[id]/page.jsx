import { PolicyDetailView } from 'src/sections/policies/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Policy Detail` };

export default function Page({ params }) {
  const { id } = params;
  return <PolicyDetailView id={id} />;
}
