import { CONFIG } from 'src/global-config';

import { FirebaseSignInView } from 'src/auth/view/firebase';

// ----------------------------------------------------------------------

export const metadata = { title: `Sign in | Firebase` };

export default function Page() {
  return <FirebaseSignInView />;
}
