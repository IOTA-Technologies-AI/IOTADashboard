'use client';

import React, { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import PercentIcon from '@mui/icons-material/Percent';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';

import { fetchZohoInvoices, fetchCustomerPayments } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard'; // Ensure this is a named import

import { AccountsListView } from './accounts-list-view'; // Import the new accounts list view component
import { AccountingEntryForm } from '../accounts-create-edit-form'; // Adjust the import path as needed

// Simple summary card component
function SummaryCard({ title, value, description, icon, color }) {
  return (
    <Card sx={{ borderTop: `4px solid ${color || '#1976d2'}`, boxShadow: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ mr: 1, color: color || 'primary.main' }}>{icon}</Box>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" sx={{ mb: 1 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}

const initialReceivable = [
  { id: 1, name: 'Client A', amount: 500000, date: '2024-06-01' },
  { id: 2, name: 'Client B', amount: 700000, date: '2024-06-03' },
];
const initialPayable = [
  { id: 1, name: 'Vendor X', amount: 300000, date: '2024-06-02' },
  { id: 2, name: 'Vendor Y', amount: 500000, date: '2024-06-04' },
];
const initialVAT = [
  { id: 1, name: 'May VAT', amount: 100000, date: '2024-06-05' },
  { id: 2, name: 'June VAT', amount: 50000, date: '2024-06-10' },
];

export default function OverviewAccountsView() {
  const theme = useTheme();
  // State for form and tabs
  const [tab, setTab] = useState(0);
  const [receivable, setReceivable] = useState(initialReceivable);
  const [payable, setPayable] = useState(initialPayable);
  const [vat, setVAT] = useState(initialVAT);
  const [form, setForm] = useState({
    module: 'receivable',
    name: '',
    amount: '',
    date: '',
  });

  // State for fetched invoices
  const [invoices, setInvoices] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]);

  // Fetch Zoho invoices on component mount
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await fetchZohoInvoices(); // Fetch invoices from Zoho
        if (response && response.invoices) {
          setInvoices(response.invoices); // Update state with fetched invoices

          // Calculate the total of invoice amount pending to be received
          const totalReceivable = response.invoices.reduce(
            (total, invoice) => total + (invoice.balance || 0), // Use `balance` for pending amount
            0
          );
          // Add a new entry to receivable state

          // Avoid duplicate entries for "Zoho Invoices"
          setReceivable((prev) =>
            prev.some((entry) => entry.name === 'Zoho Invoices')
              ? prev
              : [
                  ...prev,
                  {
                    id: Date.now(),
                    name: 'Zoho Invoices',
                    amount: totalReceivable,
                    date: new Date().toISOString().split('T')[0],
                  },
                ]
          );
        }
      } catch (error) {
        console.error('Failed to fetch Zoho invoices:', error);
      }
      const customerPaymentRespone = await fetchCustomerPayments();
      if (customerPaymentRespone) {
        console.log('Customer Payments Response:', customerPaymentRespone);
        setCustomerPayments(customerPaymentRespone);
      }
    };

    fetchCustomerPayments();
    fetchInvoices();
  }, []);

  // Handle form input
  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Handle form submit
  const handleFormSubmit = (e) => {
    e.preventDefault();
    const entry = {
      id: Date.now(),
      name: form.name,
      amount: Number(form.amount),
      date: form.date,
    };
    if (form.module === 'receivable') setReceivable([entry, ...receivable]);
    if (form.module === 'payable') setPayable([entry, ...payable]);
    if (form.module === 'vat') setVAT([entry, ...vat]);
    setForm({ ...form, name: '', amount: '', date: '' });
  };

  // Tab change
  const handleTabChange = (e, newValue) => setTab(newValue);

  return (
    <DashboardContent maxWidth="xl">
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={3}>
          <SummaryCard
            title="Accounts Receivable"
            value={`SAR${customerPayments.reduce((a, b) => a + b.amount, 0).toLocaleString()}`}
            description="Outstanding invoices to be received"
            icon={<TrendingUpIcon fontSize="large" />}
            color={theme.palette.info.main}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <SummaryCard
            title="Accounts Payable"
            value={`SAR${payable.reduce((a, b) => a + b.amount, 0).toLocaleString()}`}
            description="Outstanding bills to be paid"
            icon={<TrendingUpIcon fontSize="large" />}
            color={theme.palette.error.main}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <SummaryCard
            title="VAT"
            value={`SAR${vat.reduce((a, b) => a + b.amount, 0).toLocaleString()}`}
            description="VAT liability for this period"
            icon={<PercentIcon fontSize="large" />}
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <SummaryCard
            title="Total Transactions"
            value={`${customerPayments.length} Entries`}
            description="All account entries"
            icon={<ReceiptLongIcon fontSize="large" />}
            color={theme.palette.success.main}
          />
        </Grid>
      </Grid>

      {/* Other Components */}
      <AccountsListView />
      <br />
      <AccountingEntryForm />
    </DashboardContent>
  );
}
