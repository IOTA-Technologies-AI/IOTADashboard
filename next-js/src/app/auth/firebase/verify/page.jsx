import { CONFIG } from 'src/global-config';

import { FirebaseVerifyView } from 'src/auth/view/firebase';

// ----------------------------------------------------------------------

export const metadata = { title: `Verify | Firebase` };

export default function Page() {
  return <FirebaseVerifyView />;
}
