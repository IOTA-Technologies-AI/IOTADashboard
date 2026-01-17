import { CONFIG } from 'src/global-config';
import { SalesView } from 'src/sections/sales/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Sales` };

export default function Page() {
  return <SalesView />;
}
