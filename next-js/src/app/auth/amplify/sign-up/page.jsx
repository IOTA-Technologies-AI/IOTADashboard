import { CONFIG } from 'src/global-config';

import { AmplifySignUpView } from 'src/auth/view/amplify';

// ----------------------------------------------------------------------

export const metadata = { title: `Sign up | Amplify` };

export default function Page() {
  return <AmplifySignUpView />;
}
