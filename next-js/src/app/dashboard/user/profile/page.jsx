import { redirect } from 'next/navigation';
import { paths } from 'src/routes/paths';

export const metadata = { title: 'Profile | Dashboard' };

export default function Page() {
  redirect(paths.dashboard.user.root);
}
