import { CONFIG } from 'src/global-config';

import { TodoView } from 'src/sections/todo/view';

// ----------------------------------------------------------------------

export const metadata = { title: `To Do` };

export default function Page() {
  return <TodoView />;
}
