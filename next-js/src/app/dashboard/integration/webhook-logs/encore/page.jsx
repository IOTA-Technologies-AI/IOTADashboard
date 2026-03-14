import { WebhookLogsView } from 'src/sections/integration/view';

// ----------------------------------------------------------------------

export const metadata = { title: 'Encore Webhook Logs' };

export default function Page() {
  return <WebhookLogsView source="encore" />;
}
