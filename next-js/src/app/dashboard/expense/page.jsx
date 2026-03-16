'use client';

import { useState, useEffect } from 'react';

import { apiHelper } from 'src/utils/apiHelper';

import ExpenseListWrapper from './list-wrapper';

export default function Page() {
  const [expenses, setExpenses] = useState([]);
  const [permissionError, setPermissionError] = useState(null);

  useEffect(() => {
    apiHelper
      .getExpenses()
      .then((data) => setExpenses(Array.isArray(data) ? data : []))
      .catch((error) => {
        if (error.message?.includes('PERMISSION_DENIED')) {
          setPermissionError('You do not have permission to view expenses');
        }
        setExpenses([]);
      });
  }, []);

  return <ExpenseListWrapper expenses={expenses} permissionError={permissionError} />;
}
