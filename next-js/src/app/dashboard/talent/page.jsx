import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

// "Talent" is a menu group; its address lands on the requirements list.
export default function Page() {
  redirect(paths.dashboard.talent.requirements.root);
}
