import { use } from 'react';

import { fetchInvoice, getCustomers } from 'src/utils/apiHelper';

import { CONFIG } from 'src/global-config';

import { InvoiceDetailsView } from 'src/sections/invoice/view';

// ----------------------------------------------------------------------

export const metadata = { title: `Invoice details | Dashboard - ${CONFIG.appName}` };

export default async function Page({ params }) {
  const { id } = use(params);

  // ✅ Fetch from real API instead of mock data
  const data = await fetchInvoice(id);

  const allCustomers = await getCustomers(); // Already returns the array directly

  // Find the customer for this invoice
  const customer = allCustomers.find((c) => String(c.id) === String(data?.customerId));
  console.log('🔍 Customer ID from invoice:', data?.customerId);
  console.log('🔍 Customer found:', customer);
  console.log(
    '🔍 All customer IDs:',
    allCustomers.map((c) => c.id)
  );

  // ✅ Transform backend data to frontend format (same as edit view)
  const baseAmount = data?.baseAmount || 0;

  const currentInvoice = data
    ? {
        id: data.invoiceId,
        invoiceId: data.invoiceId,
        invoiceNumber: data.invoiceNumber,
        createDate: data.invoiceDate,
        dueDate: data.dueDate,
        status: data.status || 'draft',

        // Customer info with full details
        invoiceTo: {
          id: data.customerId,
          name: customer?.customerNameEn || data.customerName,
          fullAddress: (() => {
            if (customer?.addresses) {
              const addr = customer.addresses;
              const parts = [];
              if (addr.addressLine1) parts.push(addr.addressLine1);
              if (addr.addressLine2) parts.push(addr.addressLine2);
              if (addr.city) parts.push(addr.city);
              if (addr.state && addr.state !== addr.city) parts.push(addr.state);
              if (addr.zipCode) parts.push(addr.zipCode);
              if (addr.country) parts.push(addr.country);
              return parts.length > 0 ? parts.join(', ') : 'Address not available';
            }
            return customer?.customerNameOfBusiness
              ? `${customer.customerNameOfBusiness}, ${customer.customerBillingCountryCode === 'KSA' ? 'Saudi Arabia' : customer.customerBillingCountryCode}`
              : 'Address not available';
          })(),
          phoneNumber: customer?.addresses?.phone || customer?.addresses?.fax || 'Not available',
          email: customer?.email || 'Not available',
          vatNumber: customer?.['VAT#'] || '',
          currency: data.currencyCode || 'SAR',
        },

        // From address (you may need to set this properly)
        invoiceFrom: {
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

        // Items
        items: [
          {
            title: 'Service',
            description: data.description || '',
            quantity: 1,
            price: baseAmount,
            total: baseAmount,
          },
        ],

        // Amounts
        subtotal: baseAmount,
        vatAmount: data.vatAmount || 0,
        vatRate: data.vatRate || 0,
        totalAmount: data.total || 0,
        discount: Math.abs(data.adjustment || 0),
        shipping: data.shippingCharge || 0,
        taxes: data.vatAmount ? `${data.vatRate}%` : '0%',
        balance: data.balance || 0,
        currencyCode: data.currencyCode || 'SAR',
      }
    : null;

  return <InvoiceDetailsView invoice={currentInvoice} />;
}
