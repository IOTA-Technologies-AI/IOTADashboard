import { CONFIG } from 'src/global-config';

import BDMProfileWrapper from './profile-wrapper';

// ----------------------------------------------------------------------

export const metadata = { title: `BDM | Dashboard - ${CONFIG.appName}` };

export default async function Page({ params }) {
  const { id } = await params;

  return <BDMProfileWrapper id={id} />;
}
