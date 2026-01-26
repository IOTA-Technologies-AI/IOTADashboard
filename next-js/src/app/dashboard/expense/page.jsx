'use client';

import { useState, useEffect } from 'react';

import { apiHelper } from 'src/utils/apiHelper';

import { SplashScreen } from 'src/components/loading-screen';

import { ExpenseListView } from 'src/sections/expense/view';

// ----------------------------------------------------------------------

export default function Page() {
  const [expenses, setExpenses] = useState([]);
  const [permissionError, setPermissionError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadExpenses() {
      try {
        console.log('📄 Fetching expenses from API...');
        const data = await apiHelper.getExpenses();
        console.log('📄 Fetched expenses:', data?.length || 0);
        setExpenses(data || []);
      } catch (error) {
        console.error('📄 Error fetching expenses:', error);

        // Check if it's a permission error
        if (error.message && error.message.includes('PERMISSION_DENIED')) {
          console.error('🔒 Permission denied - user cannot view expenses');
          setPermissionError('You do not have permission to view expenses');
          setExpenses([]);
        } else {
          // For other errors, return empty array
          console.error('❌ Failed to fetch expenses:', error.message);
          setExpenses([]);
        }
      } finally {
        setLoading(false);
      }
    }

    loadExpenses();
  }, []);

  if (loading) {
    return <SplashScreen />;
  }

  return <ExpenseListView expenses={expenses} permissionError={permissionError} />;
}
