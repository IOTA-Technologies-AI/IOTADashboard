import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

// Redirect /login to the active auth provider's sign-in page
export const metadata = { title: 'Login' };

const loginRoutes = {
  jwt: paths.auth.jwt.signIn,
  amplify: paths.auth.amplify.signIn,
  firebase: paths.auth.firebase.signIn,
  auth0: paths.auth.auth0.signIn,
  supabase: paths.auth.supabase.signIn,
};

export default function Page() {
  const target = loginRoutes[CONFIG.auth.method] || paths.auth.supabase.signIn;
  redirect(target);
}
