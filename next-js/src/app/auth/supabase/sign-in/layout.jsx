import { AuthSplitLayout } from 'src/layouts/auth-split';
import { DoorScene } from 'src/layouts/auth-split/door-scene';

import { GuestGuard } from 'src/auth/guard';

// ----------------------------------------------------------------------

export default function Layout({ children }) {
  return (
    <GuestGuard>
      <AuthSplitLayout
        slotProps={{
          section: { title: 'Hi, Welcome back', illustration: <DoorScene /> },
        }}
      >
        {children}
      </AuthSplitLayout>
    </GuestGuard>
  );
}
