import { InvoiceEditView } from 'src/sections/invoice/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Invoice edit` };

// The view loads the invoice by the id in the URL. (It used to look the id up
// in the template's sample invoices first.)
export default function Page() {
  return <InvoiceEditView />;
}
