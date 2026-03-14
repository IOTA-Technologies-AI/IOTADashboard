import { WebhookLogsView } from 'src/sections/integration/view';

// ----------------------------------------------------------------------

export const metadata = { title: 'Vercel Webhook Logs' };

export default function Page() {
  return <WebhookLogsView source="vercel" />;
}
