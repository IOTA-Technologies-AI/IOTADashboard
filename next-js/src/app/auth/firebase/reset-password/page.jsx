import { CONFIG } from 'src/global-config';

import { FirebaseResetPasswordView } from 'src/auth/view/firebase';

// ----------------------------------------------------------------------

export const metadata = { title: `Reset password | Firebase` };

export default function Page() {
  return <FirebaseResetPasswordView />;
}
