import { PolicyEditView } from 'src/sections/policies/view';

export const metadata = { title: 'Edit Policy' };

export default function Page({ params }) {
  return <PolicyEditView id={params.id} />;
}
