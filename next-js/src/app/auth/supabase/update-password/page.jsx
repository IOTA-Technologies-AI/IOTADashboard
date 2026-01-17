import { CONFIG } from 'src/global-config';

import { SupabaseUpdatePasswordView } from 'src/auth/view/supabase';

// ----------------------------------------------------------------------

export const metadata = { title: `Update password | Supabase` };

export default function Page() {
  return <SupabaseUpdatePasswordView />;
}
