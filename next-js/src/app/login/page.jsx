import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

// Redirect /login to the sign-in page (Supabase, brokering Microsoft Entra ID)
export const metadata = { title: 'Login' };

export default function Page() {
  redirect(paths.auth.supabase.signIn);
}
