import { CONFIG } from 'src/global-config';

import { FileManagerView } from 'src/sections/file-manager/view';

// ----------------------------------------------------------------------

export const metadata = { title: `File manager` };

export default function Page() {
  return <FileManagerView />;
}
