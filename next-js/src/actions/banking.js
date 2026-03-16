const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app';

function getAuthHeader() {
  if (typeof window === 'undefined') return {};
  try {
    const key = Object.keys(localStorage).find(
      (k) => k.startsWith('sb-') && k.endsWith('-auth-token')
    );
    const token = key ? JSON.parse(localStorage.getItem(key) || '{}')?.access_token : null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

// ----------------------------------------------------------------------
// BANK ACCOUNTS
// ----------------------------------------------------------------------

export async function fetchBankAccounts(filters = {}) {
  try {
    let url = `${API_BASE_URL}/bankAccounts`;

    // Use region-specific endpoint if filter is provided
    if (filters.region) {
      url = `${API_BASE_URL}/bankAccounts/region/${filters.region}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    let data = result.data || [];

    // Apply status filter client-side if needed
    if (filters.status) {
      data = data.filter((account) => account.status === filters.status);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return { success: false, error: error.message };
  }
}

export async function fetchBankAccountById(accountId) {
  try {
    const response = await fetch(`${API_BASE_URL}/bankAccounts/${accountId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error fetching bank account:', error);
    return { success: false, error: error.message };
  }
}

export async function createBankAccount(accountData) {
  try {
    const response = await fetch(`${API_BASE_URL}/bankAccounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(accountData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error creating bank account:', error);
    return { success: false, error: error.message };
  }
}

export async function updateBankAccount(accountId, updates) {
  try {
    const response = await fetch(`${API_BASE_URL}/bankAccounts/${accountId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ id: accountId, ...updates }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error updating bank account:', error);
    return { success: false, error: error.message };
  }
}

export async function updateBankAccountBalance(accountId, newBalance) {
  try {
    const response = await fetch(`${API_BASE_URL}/bankAccounts/${accountId}/balance`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ id: accountId, newBalance }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error updating bank account balance:', error);
    return { success: false, error: error.message };
  }
}

// ----------------------------------------------------------------------
// BANK TRANSACTIONS
// ----------------------------------------------------------------------

export async function fetchBankTransactions(filters = {}) {
  try {
    let url = `${API_BASE_URL}/bankTransactions`;

    // Use account-specific endpoint if filter is provided
    if (filters.accountId) {
      url = `${API_BASE_URL}/bankTransactions/account/${filters.accountId}`;
    } else if (filters.statementId) {
      url = `${API_BASE_URL}/bankTransactions/statement/${filters.statementId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    let data = result.data || [];

    // Apply additional filters client-side
    if (filters.transactionType) {
      data = data.filter((txn) => txn.transactionType === filters.transactionType);
    }
    if (filters.category) {
      data = data.filter((txn) => txn.category === filters.category);
    }
    if (filters.startDate) {
      data = data.filter((txn) => txn.transactionDate >= filters.startDate);
    }
    if (filters.endDate) {
      data = data.filter((txn) => txn.transactionDate <= filters.endDate);
    }
    if (filters.limit) {
      data = data.slice(0, filters.limit);
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error fetching bank transactions:', error);
    return { success: false, error: error.message };
  }
}

export async function createBankTransaction(transactionData) {
  try {
    const response = await fetch(`${API_BASE_URL}/bankTransactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(transactionData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error creating bank transaction:', error);
    return { success: false, error: error.message };
  }
}

export async function createBulkTransactions(transactions) {
  try {
    const response = await fetch(`${API_BASE_URL}/bankTransactions/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ transactions }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const data = result.data || [];
    return { success: true, data, count: data.length };
  } catch (error) {
    console.error('Error creating bulk transactions:', error);
    return { success: false, error: error.message };
  }
}

export async function updateBankTransaction(transactionId, updates) {
  try {
    const response = await fetch(`${API_BASE_URL}/bankTransactions/${transactionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ id: transactionId, ...updates }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error updating bank transaction:', error);
    return { success: false, error: error.message };
  }
}

export async function deleteBankTransaction(transactionId) {
  try {
    const response = await fetch(`${API_BASE_URL}/bankTransactions/${transactionId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error deleting bank transaction:', error);
    return { success: false, error: error.message };
  }
}

// ----------------------------------------------------------------------
// BANK STATEMENTS
// ----------------------------------------------------------------------

export async function createBankStatement(statementData) {
  try {
    const response = await fetch(`${API_BASE_URL}/bankStatements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(statementData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error creating bank statement:', error);
    return { success: false, error: error.message };
  }
}

export async function fetchBankStatements(accountId = null) {
  try {
    let url = `${API_BASE_URL}/bankStatements`;

    if (accountId) {
      url = `${API_BASE_URL}/bankStatements/account/${accountId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data || [] };
  } catch (error) {
    console.error('Error fetching bank statements:', error);
    return { success: false, error: error.message };
  }
}

export async function updateBankStatementStatus(statementId, status, errorMessage = null) {
  try {
    const response = await fetch(`${API_BASE_URL}/bankStatements/${statementId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ id: statementId, status, errorMessage }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error updating bank statement status:', error);
    return { success: false, error: error.message };
  }
}

// ----------------------------------------------------------------------
// UTILITY FUNCTIONS
// ----------------------------------------------------------------------

export async function generateTransactionNumber() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN-${timestamp}-${random}`;
}
