import { CONFIG } from 'src/global-config';

import { OverviewCourseView } from 'src/sections/overview/course/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Course` };

export default function Page() {
  return <OverviewCourseView />;
}
