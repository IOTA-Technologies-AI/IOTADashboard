import { CONFIG } from 'src/global-config';

import { View403 } from 'src/sections/error';

// ----------------------------------------------------------------------

export const metadata = { title: `403 forbidden! | Error` };

export default function Page() {
  return <View403 />;
}
