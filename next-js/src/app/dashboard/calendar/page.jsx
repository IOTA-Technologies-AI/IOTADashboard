import { CONFIG } from 'src/global-config';

import { CalendarView } from 'src/sections/calendar/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Calendar` };

export default function Page() {
  return <CalendarView />;
}
