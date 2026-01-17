import { CONFIG } from 'src/global-config';

import { View500 } from 'src/sections/error';

// ----------------------------------------------------------------------

export const metadata = {
  title: `500 Internal server error! | Error``,
};

export default function Page() {
  return <View500 />;
}
