import { CONFIG } from 'src/global-config';

import { JwtSignInView } from 'src/auth/view/jwt';

// ----------------------------------------------------------------------

export const metadata = { title: `Sign in | Jwt` };

export default function Page() {
  return <JwtSignInView />;
}
