import { fetchInvoice, getCustomers, fetchOfficeConfigs } from 'src/utils/apiHelper';

/**
 * Shape a stored invoice the way the Invoice module's details page does, so
 * the shared `InvoicePdfDocument` renders an employee-billing invoice exactly
 * like any other. Kept here so the invoice module itself stays untouched.
 */
export async function buildInvoiceForPdf(invoiceId) {
  const [data, allCustomers, offices] = await Promise.all([
    fetchInvoice(invoiceId),
    getCustomers().catch(() => []),
    fetchOfficeConfigs().catch(() => null),
  ]);
  if (!data) throw new Error(`Invoice ${invoiceId} not found`);

  const customer = (allCustomers || []).find((c) => String(c.id) === String(data.customerId));
  const addr = customer?.addresses;
  const baseAmount = data.baseAmount || 0;

  const joinParts = (parts) => parts.filter(Boolean).join(', ');
  const street = addr
    ? joinParts([addr.addressLine1, addr.addressLine2])
    : customer?.customerNameOfBusiness || '';
  const city = addr
    ? joinParts([addr.city, addr.state !== addr.city ? addr.state : '', addr.zipCode, addr.country])
    : customer?.customerBillingCountryCode === 'KSA'
      ? 'Saudi Arabia'
      : customer?.customerBillingCountryCode || '';

  let items = [];
  try {
    const parsed = JSON.parse(data.description || '[]');
    if (Array.isArray(parsed) && parsed.length) {
      items = parsed.map((item) => {
        const quantity = Number(item.quantity ?? 1) || 1;
        const price = Number(item.price ?? baseAmount) || 0;
        return {
          title: item.title || data.invoiceTypeName || 'Service',
          titleAr: item.titleAr || '',
          description: item.description || '',
          descriptionAr: item.descriptionAr || '',
          quantity,
          price,
          total: quantity * price,
        };
      });
    }
  } catch {
    items = [];
  }
  if (!items.length) {
    items = [
      {
        title: data.invoiceTypeName || 'Service',
        description: '',
        quantity: 1,
        price: baseAmount,
        total: baseAmount,
      },
    ];
  }

  const office =
    (offices || []).find((o) => o.currency === (data.currencyCode || 'SAR')) || (offices || [])[0];

  const invoice = {
    id: data.invoiceId,
    invoiceId: data.invoiceId,
    invoiceNumber: data.invoiceNumber,
    createDate: data.invoiceDate,
    supplyDate: data.supplyDate || null,
    poNumber: data.poNumber || '',
    dueDate: data.dueDate,
    status: data.status || 'draft',
    invoiceTo: {
      id: data.customerId,
      name: customer?.customerNameEn || data.customerName,
      nameAr: customer?.customerNameAr || '',
      addressStreet: street,
      addressCity: city,
      fullAddress: joinParts([street, city]) || 'Address not available',
      phoneNumber: addr?.phone || addr?.fax || 'Not available',
      email: customer?.email || 'Not available',
      vatNumber: customer?.['VAT#'] || '',
      currency: data.currencyCode || 'SAR',
    },
    invoiceFrom: office
      ? { ...office }
      : {
          id: 1,
          name: 'IOTA Technologies',
          fullAddress: '2885, Office #9, 1st Floor, Jarir Street,',
          district: 'Al Malaz',
          city: 'Riyadh',
          country: 'Saudi Arabia',
          postalCode: '12836',
          phoneNumber: '+966 50 534 0573',
          email: 'invoice@iotatechnologies.ai',
          vatNumber: '313081317100003',
          registrationNumber: '7050457477',
        },
    items,
    subtotal: baseAmount,
    vatAmount: data.vatAmount || 0,
    vatRate: data.vatRate || 0,
    totalAmount: data.total || 0,
    discount: Math.abs(data.adjustment || 0),
    shipping: data.shippingCharge || 0,
    taxes: data.vatAmount ? `${data.vatRate}%` : '0%',
    balance: data.balance || 0,
    currencyCode: data.currencyCode || 'SAR',
    viewToken: data.viewToken || null,
    zatcaQrCode: data.zatcaQrCode || null,
  };

  return { invoice, offices: offices || undefined };
}

/** Render the shared invoice PDF to a Blob. The renderer is loaded on demand. */
export async function renderInvoicePdfBlob(invoiceId) {
  const [{ pdf: renderPdf }, { InvoicePdfDocument }, built] = await Promise.all([
    import('@react-pdf/renderer'),
    import('src/sections/invoice/invoice-pdf'),
    buildInvoiceForPdf(invoiceId),
  ]);
  const blob = await renderPdf(
    <InvoicePdfDocument
      invoice={built.invoice}
      currentStatus={built.invoice.status}
      offices={built.offices}
      zatcaQrCode={built.invoice.zatcaQrCode || undefined}
    />
  ).toBlob();
  return { blob, invoice: built.invoice };
}

export async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function downloadInvoicePdf(invoiceId, fileName) {
  const { blob, invoice } = await renderInvoicePdfBlob(invoiceId);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || `${invoice.invoiceNumber || invoiceId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
