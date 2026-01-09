import { CONFIG } from 'src/global-config';

import { TodoView } from 'src/sections/todo/view';

// ----------------------------------------------------------------------

export const metadata = { title: `To Do | Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return <TodoView />;
}
