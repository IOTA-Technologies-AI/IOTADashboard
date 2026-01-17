import { CONFIG } from 'src/global-config';

import { UserEditView } from 'src/sections/user/view';

// ----------------------------------------------------------------------

export const metadata = { title: `User edit` };

export default async function Page({ params }) {
  const { id } = await params;

  // Pass only the ID - the view will fetch the user from Microsoft 365
  return <UserEditView userId={id} />;
}
