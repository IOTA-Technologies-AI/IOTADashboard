'use client';

import { useState, useEffect } from 'react';

import { useParams } from 'next/navigation';

import { fetchInvoice, getCustomers } from 'src/utils/apiHelper';

import { InvoiceDetailsView } from 'src/sections/invoice/view';

export default function Page() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([fetchInvoice(id), getCustomers()]).then(([data, allCustomers]) => {
      if (!data) return;
      const customer = (allCustomers || []).find((c) => String(c.id) === String(data?.customerId));
      const baseAmount = data?.baseAmount || 0;
      setInvoice({
        id: data.invoiceId,
        invoiceId: data.invoiceId,
        invoiceNumber: data.invoiceNumber,
        createDate: data.invoiceDate,
        dueDate: data.dueDate,
        status: data.status || 'draft',
        invoiceTo: {
          id: data.customerId,
          name: customer?.customerNameEn || data.customerName,
          addressStreet: (() => {
            if (customer?.addresses) {
              const addr = customer.addresses;
              const parts = [];
              if (addr.addressLine1) parts.push(addr.addressLine1);
              if (addr.addressLine2) parts.push(addr.addressLine2);
              return parts.join(', ');
            }
            return customer?.customerNameOfBusiness || '';
          })(),
          addressCity: (() => {
            if (customer?.addresses) {
              const addr = customer.addresses;
              const parts = [];
              if (addr.city) parts.push(addr.city);
              if (addr.state && addr.state !== addr.city) parts.push(addr.state);
              if (addr.zipCode) parts.push(addr.zipCode);
              if (addr.country) parts.push(addr.country);
              return parts.join(', ');
            }
            return customer?.customerBillingCountryCode === 'KSA'
              ? 'Saudi Arabia'
              : customer?.customerBillingCountryCode || '';
          })(),
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
        items: (() => {
          if (data.description) {
            try {
              const parsed = JSON.parse(data.description);
              if (Array.isArray(parsed) && parsed.length > 0) {
                return parsed.map((item) => ({
                  title: item.title || data.invoiceTypeName || 'Service',
                  description: item.description || '',
                  quantity: 1,
                  price: item.price ?? baseAmount,
                  total: item.price ?? baseAmount,
                }));
              }
            } catch {
              // plain text fallback
            }
          }
          return [
            {
              title: data.invoiceTypeName || 'Service',
              description: '',
              quantity: 1,
              price: baseAmount,
              total: baseAmount,
            },
          ];
        })(),
        subtotal: baseAmount,
        vatAmount: data.vatAmount || 0,
        vatRate: data.vatRate || 0,
        totalAmount: data.total || 0,
        discount: Math.abs(data.adjustment || 0),
        shipping: data.shippingCharge || 0,
        taxes: data.vatAmount ? `${data.vatRate}%` : '0%',
        balance: data.balance || 0,
        currencyCode: data.currencyCode || 'SAR',
      });
    });
  }, [id]);

  if (!invoice) return null;
  return <InvoiceDetailsView invoice={invoice} />;
}
