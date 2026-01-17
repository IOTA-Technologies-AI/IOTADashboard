import { CONFIG } from 'src/global-config';

import { ContactView } from 'src/sections/contact/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Contact us` };

export default function Page() {
  return <ContactView />;
}
