import { WebhookLogsView } from 'src/sections/integration/view';

// ----------------------------------------------------------------------

export const metadata = { title: 'Resend Webhook Logs' };

export default function Page() {
  return <WebhookLogsView source="resend" />;
}
