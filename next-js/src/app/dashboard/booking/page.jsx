import { CONFIG } from 'src/global-config';

import { OverviewBookingView } from 'src/sections/overview/booking/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Booking` };

export default function Page() {
  return <OverviewBookingView />;
}
