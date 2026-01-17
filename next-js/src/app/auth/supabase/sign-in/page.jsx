import { CONFIG } from 'src/global-config';

import { SupabaseSignInView } from 'src/auth/view/supabase';

// ----------------------------------------------------------------------

export const metadata = { title: `Sign in | Supabase` };

export default function Page() {
  return <SupabaseSignInView />;
}
