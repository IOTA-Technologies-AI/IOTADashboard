import { CONFIG } from 'src/global-config';

import { ExpenseCreateView } from 'src/sections/expense/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Create a new expense` };

export default function Page() {
  return <ExpenseCreateView />;
}
