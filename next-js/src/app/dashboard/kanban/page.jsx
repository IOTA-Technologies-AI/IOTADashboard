import { CONFIG } from 'src/global-config';

import { KanbanView } from 'src/sections/kanban/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Kanban` };

export default function Page() {
  return <KanbanView />;
}
