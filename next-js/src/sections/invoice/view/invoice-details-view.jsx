'use client';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { EditAuditTimeline } from 'src/components/edit-audit';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { InvoiceDetails } from '../invoice-details';

// ----------------------------------------------------------------------

export function InvoiceDetailsView({ invoice }) {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={invoice?.invoiceNumber}
        backHref={paths.dashboard.invoice.root}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Invoice', href: paths.dashboard.invoice.root },
          { name: invoice?.invoiceNumber },
        ]}
        sx={{ mb: 3 }}
      />

      <InvoiceDetails invoice={invoice} />

      {/* Only rendered once this invoice has actually been edited under
          Record Edit Mode — otherwise it stays out of the way. */}
      <EditAuditTimeline
        entityType="invoice"
        entityId={invoice?.invoiceId || invoice?.id}
        sx={{ mt: 3 }}
      />
    </DashboardContent>
  );
}
