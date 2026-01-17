import { CONFIG } from 'src/global-config';

import { SplitSignUpView } from 'src/auth/view/auth-demo/split';

// ----------------------------------------------------------------------

export const metadata = { title: `Sign up | Layout split` };

export default function Page() {
  return <SplitSignUpView />;
}
