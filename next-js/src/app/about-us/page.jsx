import { CONFIG } from 'src/global-config';

import { AboutView } from 'src/sections/about/view';

// ----------------------------------------------------------------------

export const metadata = { title: `About us` };

export default function Page() {
  return <AboutView />;
}
