import { CONFIG } from 'src/global-config';

import FileManagerListWrapper from './list-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `File manager` };

export default function Page() {
  return <FileManagerListWrapper />;
}
