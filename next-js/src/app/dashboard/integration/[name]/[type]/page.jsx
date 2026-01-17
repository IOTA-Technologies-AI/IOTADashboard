import { CONFIG } from 'src/global-config';

import { IntegrationDetailsView } from 'src/sections/integration/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Integration Details` };

export default async function Page({ params }) {
  const { name, type } = await params;

  return <IntegrationDetailsView integrationName={name} integrationType={type} />;
}
