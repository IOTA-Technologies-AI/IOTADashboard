'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { fetchInvoice } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { InvoiceCreateEditForm } from '../invoice-create-edit-form';

export function InvoiceEditView({ invoice: initialInvoice }) {
  const params = useParams();
  const [invoice, setInvoice] = useState(initialInvoice);
  const [loading, setLoading] = useState(!initialInvoice);

  useEffect(() => {
    if (!initialInvoice && params?.id) {
      fetchInvoice(params.id)
        .then((data) => {
          if (data) {
            console.log('📥 Fetched invoice data:', data);

            // ✅ CREATE DEFAULT ITEM FROM BASEAMOUNT (since DB doesn't store items array)
            const baseAmount = data.baseAmount || 0;
            const defaultItems = [
              {
                title: 'Service',
                service: 'General Service',
                description: data.description || '',
                quantity: 1,
                price: baseAmount, // Use baseAmount as the item price
                total: baseAmount,
              },
            ];

            // Transform backend data to match form structure
            const transformedInvoice = {
              id: data.invoiceId, // ✅ USE NUMERIC ID, NOT invoiceId STRING
              invoiceId: data.invoiceId, // ✅ KEEP THIS SEPARATE
              invoiceNumber: data.invoiceNumber,
              createDate: data.invoiceDate,
              dueDate: data.dueDate,
              invoiceTo: {
                id: data.customerId,
                name: data.customerName,
                currency: data.currencyCode || 'SAR',
              },
              invoiceFrom: null,
              items: defaultItems,
              subtotal: baseAmount,
              totalAmount: data.total || 0,
              shipping: data.shippingCharge || 0,
              discount: Math.abs(data.adjustment || 0),
              vatAmount: data.vatAmount || 0,
              vatRate: data.vatRate || 0,
              status: data.status || 'draft',
              taxes: 0,
            };

            console.log('✅ Transformed invoice for form:', transformedInvoice);
            setInvoice(transformedInvoice);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error('Failed to fetch invoice:', error);
          setLoading(false);
        });
    }
  }, [initialInvoice, params?.id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit"
        backHref={paths.dashboard.invoice.root}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Invoice', href: paths.dashboard.invoice.root },
          { name: invoice?.invoiceNumber || 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <InvoiceCreateEditForm currentInvoice={invoice} />
    </DashboardContent>
  );
}
