import { CONFIG } from 'src/global-config';

import BDMListWrapper from './list-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `BDMs | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <BDMListWrapper />;
}
