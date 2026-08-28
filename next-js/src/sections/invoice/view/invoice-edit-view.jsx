'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { paths } from 'src/routes/paths';

import { fetchInvoice } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';
import { useCanEditLockedRecord } from 'src/actions/admin-edit-mode';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { IOTA_OFFICES } from '../invoice-create-edit-address';
import { InvoiceCreateEditForm } from '../invoice-create-edit-form';

export function InvoiceEditView({ invoice: initialInvoice }) {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthContext();

  const [invoice, setInvoice] = useState(initialInvoice);
  const [loading, setLoading] = useState(!initialInvoice);

  const roleIdToName = { 1: 'regular', 2: 'manager', 3: 'admin', 4: 'superAdmin' };
  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';
  // The creator can edit only while the invoice is still pending. A super-admin
  // can also edit it once it is approved/paid/rejected, but only while Record
  // Edit Mode is switched on in Account > Admin Settings.
  const isPending = invoice?.status === 'pending' || invoice?.status === 'draft';
  const { canEditLocked, editModeLoading } = useCanEditLockedRecord(isPending);
  const canEdit =
    canEditLocked ||
    (isPending && !!invoice?.createdByEmail && invoice?.createdByEmail === user?.email);

  useEffect(() => {
    // Wait for the edit-mode window to resolve before bouncing a super-admin out.
    if (!loading && !editModeLoading && invoice && !canEdit) {
      toast.error(
        normalizedRole === 'superAdmin'
          ? 'This invoice is locked. Switch on Record Edit Mode in Account > Admin Settings to edit it.'
          : 'You can only edit your own pending invoices.'
      );
      router.replace(paths.dashboard.invoice.root);
    }
  }, [canEdit, invoice, loading, editModeLoading, normalizedRole, router]);

  useEffect(() => {
    if (!initialInvoice && params?.id) {
      fetchInvoice(params.id)
        .then((data) => {
          if (data) {
            console.log('📥 Fetched invoice data:', data);

            // Parse items from the description JSON field (saved by the form)
            const baseAmount = data.baseAmount || 0;
            let defaultItems;
            if (data.description) {
              try {
                const parsed = JSON.parse(data.description);
                if (Array.isArray(parsed) && parsed.length > 0) {
                  defaultItems = parsed.map((item) => {
                    // Items saved before quantity was persisted carry none —
                    // they were priced as a single unit.
                    const quantity = Number(item.quantity ?? 1) || 1;
                    const price = item.price ?? baseAmount;
                    return {
                      title: item.title || '',
                      // Arabic title / description printed on the bilingual invoice
                      titleAr: item.titleAr || '',
                      service: item.service || data.invoiceTypeName || 'General Service',
                      description: item.description || '',
                      descriptionAr: item.descriptionAr || '',
                      quantity,
                      price,
                      total: quantity * price,
                    };
                  });
                }
              } catch {
                // Plain text description — single item
                defaultItems = [
                  {
                    title: data.invoiceTypeName || 'Service',
                    service: data.invoiceTypeName || 'General Service',
                    description: data.description,
                    quantity: 1,
                    price: baseAmount,
                    total: baseAmount,
                  },
                ];
              }
            }
            if (!defaultItems) {
              defaultItems = [
                {
                  title: data.invoiceTypeName || 'Service',
                  service: data.invoiceTypeName || 'General Service',
                  description: '',
                  quantity: 1,
                  price: baseAmount,
                  total: baseAmount,
                },
              ];
            }

            // Map invoiceFrom from currencyCode so the correct IOTA office is pre-selected
            const invoiceFrom =
              IOTA_OFFICES.find((o) => o.currency === (data.currencyCode || 'SAR')) ||
              IOTA_OFFICES[0];

            // Transform backend data to match form structure
            const transformedInvoice = {
              id: data.invoiceId,
              invoiceId: data.invoiceId,
              invoiceNumber: data.invoiceNumber,
              createDate: data.invoiceDate,
              supplyDate: data.supplyDate || null,
              poNumber: data.poNumber || '',
              dueDate: data.dueDate,
              invoiceTo: {
                id: data.customerId,
                name: data.customerName,
                currency: data.currencyCode || 'SAR',
              },
              invoiceFrom,
              items: defaultItems,
              subtotal: baseAmount,
              totalAmount: data.total || 0,
              shipping: data.shippingCharge || 0,
              discount: Math.abs(data.adjustment || 0),
              vatAmount: data.vatAmount || 0,
              vatRate: data.vatRate || 0,
              status: data.status || 'draft',
              taxes: 0,
              // Preserve all DB fields so they are not nulled on save
              invoiceTypeId: data.invoiceTypeId || '',
              invoiceTypeName: data.invoiceTypeName || '',
              costcenterId: data.costcenterId || '',
              isEmployeeRelated: data.isEmployeeRelated || false,
              employeeId: data.employeeId || '',
              employeeName: data.employeeName || '',
              // Approval workflow fields
              rejectionReason: data.rejectionReason || null,
              createdByEmail: data.createdByEmail || '',
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

  if (loading || editModeLoading || !canEdit) {
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
