import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

export const metadata = { title: 'Supabase Login' };

export default function Page() {
  redirect(paths.auth.supabase.signIn);
}
