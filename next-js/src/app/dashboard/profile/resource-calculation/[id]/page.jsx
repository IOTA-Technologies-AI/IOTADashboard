import { ResourceCalculationFormView } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const metadata = { title: 'Profile | Resource Calculation' };

export default function Page({ params }) {
  return <ResourceCalculationFormView id={params.id} />;
}
