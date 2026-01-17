import { CONFIG } from 'src/global-config';

import { AmplifyResetPasswordView } from 'src/auth/view/amplify';

// ----------------------------------------------------------------------

export const metadata = { title: `Reset password | Amplify` };

export default function Page() {
  return <AmplifyResetPasswordView />;
}
