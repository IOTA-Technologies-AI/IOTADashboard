import { CONFIG } from 'src/global-config';

import { JwtSignUpView } from 'src/auth/view/jwt';

// ----------------------------------------------------------------------

export const metadata = { title: `Sign up | Jwt` };

export default function Page() {
  return <JwtSignUpView />;
}
