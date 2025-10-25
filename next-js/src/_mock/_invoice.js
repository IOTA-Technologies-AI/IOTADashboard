import { fetchZohoInvoices } from 'src/utils/apiHelper';

import { _mock } from './_mock';
import { _tags } from './assets';

// ----------------------------------------------------------------------

export const INVOICE_STATUS_OPTIONS = [
  { value: 'paid', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'draft', label: 'Draft' },
];

let invoices = [];

export const INVOICE_SERVICE_OPTIONS = [
  { id: 'general-service', name: 'General Service', price: 0 },
  ...Array.from({ length: 8 }, (_, index) => ({
    id: _mock.id(index),
    name: _tags[index],
    price: _mock.number.price(index),
  })),
];

const ITEMS = Array.from({ length: 3 }, (__, index) => {
  const total = INVOICE_SERVICE_OPTIONS[index].price * _mock.number.nativeS(index);

  return {
    id: _mock.id(index),
    total,
    title: _mock.productName(index),
    description: _mock.sentence(index),
    price: INVOICE_SERVICE_OPTIONS[index].price,
    service: INVOICE_SERVICE_OPTIONS[index].name,
    quantity: _mock.number.nativeS(index),
  };
});

export async function fetchInvoices() {
  try {
    invoices = await fetchZohoInvoices();
    console.log('Fetched invoices:', invoices);
    return invoices;
  } catch (error) {
    console.warn('Failed to fetch invoices (non-critical):', error);
    return [];
  }
}

// ❌ REMOVE THIS LINE - Don't auto-fetch on module import
// await fetchInvoices().then(() => {
//   console.log('Fetched invoices:', invoices);
// });

export const _invoices = Array.from({ length: 20 }, (_, index) => {
  // Use fixed length instead
  const taxes = '15%';
  const subtotal = ITEMS.reduce((accumulator, item) => accumulator + item.price * item.quantity, 0);
  const totalAmount = _mock.number.price(index);
  const status = ['PAID', 'PENDING', 'OVERDUE', 'DRAFT'][index % 4];

  return {
    id: _mock.id(index),
    taxes,
    status,
    discount: 0,
    shipping: 0,
    subtotal,
    totalAmount,
    items: ITEMS,
    invoiceNumber: `INV-${1990 + index}`,
    invoiceFrom: 'IOTA Technologies',
    invoiceTo: _mock.companyNames(index),
    sent: _mock.number.nativeS(index),
    createDate: _mock.time(index),
    dueDate: _mock.time(index),
  };
});
