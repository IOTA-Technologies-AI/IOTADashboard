const axios = require('axios');

import { decodeJWT, extractJWTFromSession } from './jwt-auth';

const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app/';

const PARTER_API_BASE_URL = 'https://staging-iwtapiserver-6x92.encr.app/getTotalInvoiceAmounts';
const PARTER_AUTH_TOKEN = 'Bearer dGVzdEB0ZXN0LmNvbTpwYXN29yZDEyMyE=';

/**
 * Get Authorization header with JWT token
 * Backend expects: Authorization: Bearer {jwt_token}
 */
function getAuthHeaders() {
  const token = extractJWTFromSession();
  if (!token) {
    console.warn('[apiHelper] No JWT token available');
    return {};
  }
  return {
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Get user context from localStorage (set by auth provider) or JWT fallback
 * Returns user email, role, and roleId for permission checks
 * Auth provider stores user context in localStorage with correct role/roleId
 */
function getUserContext() {
  if (typeof window === 'undefined') return null;

  try {
    // First try localStorage (auth provider stores this with correct role/roleId)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.email) {
        console.log('[apiHelper] Got user context from localStorage:', {
          email: user.email,
          role: user.role,
          roleId: user.roleId,
        });
        return {
          userEmail: user.email,
          role: user.role || 'regular',
          roleId: user.roleId || 1,
        };
      }
    }

    // Fallback: Try to get email from JWT (but role will be default)
    const token = extractJWTFromSession();
    if (token) {
      const decoded = decodeJWT(token);
      if (decoded && decoded.email) {
        console.warn(
          '[apiHelper] Got email from JWT but no role - using default. User should refresh or sign in again.'
        );
        return {
          userEmail: decoded.email,
          role: 'regular', // Default - auth provider should set this
          roleId: 1,
        };
      }
    }

    console.warn('[apiHelper] No user context available (no localStorage.user or JWT)');
    return null;
  } catch (error) {
    console.warn('[apiHelper] Failed to get user context:', error);
    return null;
  }
}

export async function getExpenseById(id) {
  if (!id) return null;
  try {
    const authHeaders = getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}expenses/${id}`, {
      headers: authHeaders,
    });
    return response.data?.expense || response.data || null;
  } catch (error) {
    console.error('Failed to fetch expense', error.response?.data || error.message);
    throw error;
  }
}

export async function getExpenseByExpenseId(id) {
  if (!id) return null;
  try {
    const authHeaders = getAuthHeaders();
    const response = await axios.get(`${API_BASE_URL}getExpenseById/${id}`, {
      headers: authHeaders,
    });
    return response.data?.expense || response.data || null;
  } catch (error) {
    console.error('Failed to fetch expense', error.response?.data || error.message);
    throw error;
  }
}

// Get single expense by referenceId with permission check
export async function getExpense(referenceId) {
  if (!referenceId) return null;

  try {
    console.log(`📤 Fetching expense ${referenceId} with permission check`);
    const userContext = getUserContext();
    const authHeaders = getAuthHeaders();

    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_BASE_URL}expenses/${referenceId}`,
      headers: {
        ...authHeaders,
      },
      params: userContext || {}, // Include user context for permission check
    };

    return axios
      .request(config)
      .then((response) => response.data?.expense || null)
      .catch((error) => {
        console.error('❌ Get expense API error:', error.response?.data || error.message);
        if (error.response?.status === 403) {
          throw new Error('PERMISSION_DENIED: You do not have permission to view this expense');
        }
        throw new Error(
          error.response?.data?.message || error.message || 'Failed to fetch expense'
        );
      });
  } catch (error) {
    console.error('❌ Failed to fetch expense:', error);
    throw error;
  }
}

async function fetchTotalIotaBilling() {
  try {
    const response = await axios.get(`${API_BASE_URL}expenses`);
    const expenses = response.data?.expenses || [];
    return expenses.reduce(
      (sum, expense) => sum + Number(expense.expenseAmount ?? expense.amount ?? 0),
      0
    );
  } catch (error) {
    console.error('Failed to fetch total IOTA billing:', error);
    throw error; // Re-throw the error for the caller to handle
  }
}

async function fetchTotalPartnerBilling(invoicePeriod) {
  try {
    console.log(invoicePeriod);
    const response = await fetch(`${PARTER_API_BASE_URL}?invoicePeriod=${invoicePeriod}`, {
      headers: {
        Authorization: PARTER_AUTH_TOKEN,
      },
    });
    const data = await response.json();
    var responseStr = { totalPaid: 0, totalPending: 0 };
    responseStr.totalPaid = data.totalPaid || 0;
    responseStr.totalPending = data.totalPending || 0;
    return responseStr;
  } catch (error) {
    console.error('Failed to fetch total Partner billing:', error);
    throw error; // Re-throw the error for the caller to handle
  }
}

export async function fetchZohoInvoices() {
  try {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://staging-iotaapiserver-s572.encr.app/invoices',
      headers: {},
    };

    return axios
      .request(config)
      .then((response) => response.data.invoices || [])
      .catch((error) => {
        console.warn('Invoices API error (non-critical):', error.response?.data || error.message);
        return { invoices: [] }; // Return empty structure instead of error
      });
  } catch (error) {
    console.warn('Failed to fetch Zoho invoices (non-critical):', error);
    return { invoices: [] }; // Return empty structure
  }
}

export async function fetchCustomerPayments() {
  try {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://staging-iotaapiserver-s572.encr.app/customerpayments',
      headers: {},
    };

    return axios
      .request(config)
      .then((response) => response.data.customerpayments || [])
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    console.error('Failed to fetch Customer Payments:', error);
    throw error; // Re-throw the error for the caller to handle
  }
}

export async function getCustomers() {
  try {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://staging-iotaapiserver-s572.encr.app/customers',
      headers: {},
    };

    return axios
      .request(config)
      .then((response) => response.data.customers || [])
      .catch((error) => {
        console.log(error);
      });
  } catch (error) {
    console.error('Failed to fetch Customer Payments:', error);
    throw error; // Re-throw the error for the caller to handle
  }
}

export async function getVendors() {
  try {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://staging-iotaapiserver-s572.encr.app/vendors',
      headers: {},
    };

    return axios
      .request(config)
      .then((response) => {
        const vendors = response.data.vendors || [];

        // 🔄 Map backend field names to frontend field names
        return vendors.map((vendor) => ({
          ...vendor,
          phoneNumber: vendor.phone, // phone → phoneNumber
          contactPerson: vendor.primaryContactName, // primaryContactName → contactPerson
          bankSwiftCode: vendor.swiftCode, // swiftCode → bankSwiftCode
        }));
      })
      .catch((error) => {
        console.error('❌ Vendors API error:', error.response?.data || error.message);
        return [];
      });
  } catch (error) {
    console.error('❌ Failed to fetch vendors:', error);
    return [];
  }
}

export async function getCostCenters() {
  try {
    // Use proxy route on client side to avoid CORS
    const isClient = typeof window !== 'undefined';
    const url = isClient ? '/api/costcenters' : `${API_BASE_URL}costcenters`;
    const response = await axios.get(url);
    const list = response.data?.costCenters || response.data?.data || response.data || [];
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.warn('⚠️ Cost center fetch failed:', error.response?.status, error.message);
    return [];
  }
}

export async function getExpenseTypes() {
  try {
    const isClient = typeof window !== 'undefined';
    const url = isClient ? '/api/expensetypes' : `${API_BASE_URL}expensetypes`;
    const response = await axios.get(url);
    const list = response.data?.expenseTypes || response.data?.data || response.data || [];
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.warn('⚠️ Expense types fetch failed:', error.response?.status, error.message);
    return [];
  }
}

export async function getInvoiceTypes() {
  try {
    const isClient = typeof window !== 'undefined';
    const url = isClient ? '/api/invoicetypes' : `${API_BASE_URL}invoicetypes`;
    const response = await axios.get(url);
    const list = response.data?.invoiceTypes || response.data?.data || response.data || [];
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.warn('⚠️ Invoice types fetch failed:', error.response?.status, error.message);
    return [];
  }
}

// Payroll APIs
export async function fetchPayrollRuns() {
  const url = `${API_BASE_URL}/payroll/runs`;
  const response = await axios.get(url);
  return response.data?.payrollRuns || [];
}

export async function fetchPayrollRun(id) {
  const url = `${API_BASE_URL}/payroll/runs/${id}`;
  const response = await axios.get(url);
  return response.data;
}

export async function createPayrollRun(body) {
  const url = `${API_BASE_URL}/payroll/runs`;
  const response = await axios.post(url, body);
  return response.data;
}

export async function postPayrollToBank(id) {
  const url = `${API_BASE_URL}/payroll/runs/${id}/process`;
  const response = await axios.post(url);
  return response.data;
}

// Approve or reject a payroll run
export async function approvePayrollRun({ id, approvedBy, status, notes }) {
  const url = `${API_BASE_URL}/payroll/runs/${id}/approve`;
  const response = await axios.post(url, {
    approvedBy,
    status,
    notes,
  });
  return response.data;
}

// Update manual deductions on a single payroll line item
export async function updatePayrollLineItemDeductions(
  id,
  { manualDeductionAmount, manualDeductionRemarks }
) {
  const url = `${API_BASE_URL}/payroll/line-items/${id}`;
  const response = await axios.patch(url, { manualDeductionAmount, manualDeductionRemarks });
  return response.data;
}

export async function updateVendor(id, vendorData) {
  try {
    // Encore expects id and body fields in one object
    const requestBody = {
      id, // Include id in the body for Encore path parameter
      ...vendorData, // Spread the vendor data fields
    };

    let config = {
      method: 'patch',
      maxBodyLength: Infinity,
      url: `https://staging-iotaapiserver-s572.encr.app/vendors/${id}`,
      headers: {
        'Content-Type': 'application/json',
      },
      data: requestBody, // Send combined object, don't stringify
    };

    return axios
      .request(config)
      .then((response) => {
        console.log('✅ Vendor updated:', response.data);
        return response.data.vendor;
      })
      .catch((error) => {
        console.error('❌ Update vendor error:', error.response?.data || error.message);
        throw error;
      });
  } catch (error) {
    console.error('❌ Failed to update vendor:', error);
    throw error;
  }
}

export async function createVendor(vendorData) {
  try {
    // Map frontend field names to backend database names
    const mappedData = { ...vendorData };

    if (mappedData.phoneNumber) {
      mappedData.phone = mappedData.phoneNumber;
      delete mappedData.phoneNumber;
    }
    if (mappedData.contactPerson) {
      mappedData.primaryContactName = mappedData.contactPerson;
      delete mappedData.contactPerson;
    }
    if (mappedData.bankSwiftCode) {
      mappedData.swiftCode = mappedData.bankSwiftCode;
      delete mappedData.bankSwiftCode;
    }

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://staging-iotaapiserver-s572.encr.app/vendors',
      headers: {
        'Content-Type': 'application/json',
      },
      data: mappedData,
    };

    return axios
      .request(config)
      .then((response) => {
        console.log('✅ Vendor created:', response.data);
        return response.data.vendor;
      })
      .catch((error) => {
        console.error('❌ Create vendor error:', error.response?.data || error.message);
        console.error('❌ Error details:', {
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
        });
        throw error;
      });
  } catch (error) {
    console.error('❌ Failed to create vendor:', error);
    throw error;
  }
}

// ============================================================================
// Expense API Functions
// ============================================================================

export async function getExpenses() {
  try {
    const authHeaders = getAuthHeaders();

    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_BASE_URL}expenses`,
      headers: {
        ...authHeaders,
      },
    };

    return axios
      .request(config)
      .then((response) => {
        const expenses = response.data.expenses || [];
        return expenses;
      })
      .catch((error) => {
        console.error('❌ Expenses API error:', error.response?.data || error.message);
        // Check if it's a permission error
        if (error.response?.status === 403) {
          console.error('🔒 Permission denied: User does not have access to expenses');
          throw new Error('PERMISSION_DENIED: You do not have permission to view expenses');
        }
        // For other errors, also throw instead of returning empty array
        throw new Error(
          error.response?.data?.message || error.message || 'Failed to fetch expenses'
        );
      });
  } catch (error) {
    console.error('❌ Failed to fetch expense:', error);
    throw error;
  }
}

// Get expenses with linked invoices (expenseType 18) - for deals
export async function getExpensesWithLinkedInvoices() {
  try {
    const authHeaders = getAuthHeaders();

    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `${API_BASE_URL}expenses`,
      headers: {},
    };

    return axios
      .request(config)
      .then((response) => {
        const expenses = response.data.expenses || [];
        // Filter for expenseType 18 (Invoice Against Invoice)
        const linkedExpenses = expenses.filter((exp) => exp.expenseType === 18);
        console.log(`✅ Fetched ${linkedExpenses.length} expenses with linked invoices`);
        return linkedExpenses;
      })
      .catch((error) => {
        console.error('❌ Linked Expenses API error:', error.response?.data || error.message);
        return [];
      });
  } catch (error) {
    console.error('❌ Failed to fetch linked expenses:', error);
    return [];
  }
}

export async function createExpense(expenseData) {
  try {
    console.log('📤 Creating expense:', expenseData);

    const userContext = getUserContext();

    if (!userContext || !userContext.userEmail) {
      console.error('❌ No user context available.');
      console.log('JWT token available:', extractJWTFromSession() ? 'Yes' : 'No');
      console.log('localStorage.user:', localStorage.getItem('user'));
      throw new Error('User authentication required. Please refresh the page or sign in again.');
    }

    console.log('📤 User context:', userContext);
    const dataWithContext = { ...expenseData, ...userContext };
    console.log('📤 Full data being sent to backend:', JSON.stringify(dataWithContext, null, 2));

    const authHeaders = getAuthHeaders();
    console.log('📤 Auth headers:', authHeaders ? '✅ JWT token present' : '❌ No JWT token');

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${API_BASE_URL}expenses`,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      data: JSON.stringify(dataWithContext),
    };

    return axios
      .request(config)
      .then((response) => {
        console.log('✅ Expense created successfully:', response.data);
        return response.data.expense;
      })
      .catch((error) => {
        console.error('❌ Create expense error:', error.response?.data || error.message);
        if (error.response?.status === 403) {
          throw new Error('You do not have permission to create expenses');
        }
        throw error;
      });
  } catch (error) {
    console.error('❌ Failed to create expense:', error);
    throw error;
  }
}

export async function updateExpense(referenceId, expenseData) {
  try {
    console.log(`📤 Updating expense ${referenceId}:`, expenseData);
    console.log('📤 expenseData type check:', {
      expenseApprovalStatus: expenseData.expenseApprovalStatus,
      typeOf: typeof expenseData.expenseApprovalStatus,
    });

    const userContext = getUserContext();
    const dataWithContext = { ...expenseData, ...userContext, referenceId };
    const jsonString = JSON.stringify(dataWithContext);
    console.log('📤 JSON string being sent:', jsonString);

    const authHeaders = getAuthHeaders();
    console.log('📤 Auth headers:', authHeaders ? '✅ JWT token present' : '❌ No JWT token');

    let config = {
      method: 'patch',
      maxBodyLength: Infinity,
      url: `${API_BASE_URL}expenses/${referenceId}`,
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      data: jsonString,
    };

    return axios
      .request(config)
      .then((response) => {
        console.log('✅ Expense updated successfully:', response.data);
        return response.data.expense;
      })
      .catch((error) => {
        console.error('❌ Update expense error:', error.response?.data || error.message);
        if (error.response?.status === 403) {
          throw new Error('You do not have permission to update expenses');
        }
        throw error;
      });
  } catch (error) {
    console.error('❌ Failed to update expense:', error);
    throw error;
  }
}

export async function uploadExpenseAttachment({ folderPath, fileName, fileContent, userId }) {
  if (!fileName || !fileContent || !folderPath) {
    throw new Error('folderPath, fileName, and fileContent are required');
  }

  const payload = {
    folderPath,
    fileName,
    fileContent,
    userId,
  };

  try {
    const response = await axios.post(`${API_BASE_URL}onedrive/upload`, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  } catch (error) {
    console.error('❌ Expense attachment upload failed:', error.response?.data || error.message);
    throw error;
  }
}

// Add these functions to your existing apiHelper.js

// Accounts Receivable APIs
// Change this constant at the top of the file
const ENCORE_API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app';

// ============================================================================
// Accounts Receivable APIs
// ============================================================================

export async function fetchAccountsReceivable() {
  try {
    const response = await fetch(`${ENCORE_API_BASE_URL}/accountsReceivable`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Failed to fetch accounts receivable');

    return await response.json();
  } catch (error) {
    console.error('Error fetching AR:', error);
    throw error;
  }
}

export async function fetchAccountsReceivableByDateRange(startDate, endDate) {
  try {
    const response = await fetch(`${ENCORE_API_BASE_URL}/accountsReceivable/daterange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate }),
    });

    if (!response.ok) throw new Error('Failed to fetch AR by date range');

    return await response.json();
  } catch (error) {
    console.error('Error fetching AR by date:', error);
    throw error;
  }
}

// ============================================================================
// Accounts Payable APIs
// ============================================================================

export async function fetchAccountsPayable() {
  try {
    const response = await fetch(`${ENCORE_API_BASE_URL}/accountsPayable`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Failed to fetch accounts payable');

    return await response.json();
  } catch (error) {
    console.error('Error fetching AP:', error);
    throw error;
  }
}

export async function fetchAccountsPayableByDateRange(startDate, endDate) {
  try {
    const response = await fetch(`${ENCORE_API_BASE_URL}/accountsPayable/daterange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate }),
    });

    if (!response.ok) throw new Error('Failed to fetch AP by date range');

    return await response.json();
  } catch (error) {
    console.error('Error fetching AP by date:', error);
    throw error;
  }
}

// ============================================================================
// VAT Transactions APIs
// ============================================================================

export async function fetchVATTransactions() {
  try {
    const response = await fetch(`${ENCORE_API_BASE_URL}/vatTransactions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Failed to fetch VAT transactions');

    return await response.json();
  } catch (error) {
    console.error('Error fetching VAT transactions:', error);
    throw error;
  }
}

export async function fetchVATTransactionsByDateRange(startDate, endDate) {
  try {
    const response = await fetch(`${ENCORE_API_BASE_URL}/vatTransactions/daterange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate }),
    });

    if (!response.ok) throw new Error('Failed to fetch VAT transactions by date range');

    return await response.json();
  } catch (error) {
    console.error('Error fetching VAT transactions by date:', error);
    throw error;
  }
}

export async function fetchVATTransactionsByTaxPeriod(taxPeriod) {
  try {
    const response = await fetch(`${ENCORE_API_BASE_URL}/vatTransactions/period/${taxPeriod}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Failed to fetch VAT transactions by period');

    return await response.json();
  } catch (error) {
    console.error('Error fetching VAT transactions by period:', error);
    throw error;
  }
}

// Post VAT for a quarter - locks in VAT transactions for ZATCA filing
export async function postQuarterlyVAT(year, quarter, postedBy) {
  try {
    console.log(`📤 Posting VAT for Q${quarter}-${year}`);
    const response = await fetch(`${ENCORE_API_BASE_URL}/vatTransactions/post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, quarter, postedBy }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to post quarterly VAT');
    }

    return await response.json();
  } catch (error) {
    console.error('Error posting quarterly VAT:', error);
    throw error;
  }
}

// Get VAT posting status for a quarter
export async function getVATPostingStatus(year, quarter) {
  try {
    const response = await fetch(
      `${ENCORE_API_BASE_URL}/vatTransactions/status/${year}/${quarter}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) throw new Error('Failed to get VAT posting status');

    return await response.json();
  } catch (error) {
    console.error('Error getting VAT posting status:', error);
    throw error;
  }
}

// Get VAT summary for a quarter (from posted VAT transactions)
export async function getVATSummaryByQuarter(year, quarter) {
  try {
    const response = await fetch(
      `${ENCORE_API_BASE_URL}/vatTransactions/summary/${year}/${quarter}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!response.ok) throw new Error('Failed to get VAT summary');

    return await response.json();
  } catch (error) {
    console.error('Error getting VAT summary:', error);
    throw error;
  }
}

// ===========================================================================
// VAT Returns API Functions - Store VAT Return summaries
// ===========================================================================

// Save VAT Return summary to database
export async function saveVATReturn(vatReturnData) {
  try {
    console.log('📤 Saving VAT Return:', vatReturnData.taxPeriod);
    const response = await fetch(`${ENCORE_API_BASE_URL}/vatReturns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vatReturnData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save VAT Return');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving VAT Return:', error);
    throw error;
  }
}

// Get all VAT Returns
export async function getVATReturns() {
  try {
    const response = await fetch(`${ENCORE_API_BASE_URL}/vatReturns`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Failed to fetch VAT Returns');

    return await response.json();
  } catch (error) {
    console.error('Error fetching VAT Returns:', error);
    throw error;
  }
}

// Get VAT Return by tax period
export async function getVATReturnByPeriod(taxPeriod) {
  try {
    const response = await fetch(`${ENCORE_API_BASE_URL}/vatReturns/${taxPeriod}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) throw new Error('Failed to fetch VAT Return');

    return await response.json();
  } catch (error) {
    console.error('Error fetching VAT Return:', error);
    throw error;
  }
}

// Update VAT Return status
export async function updateVATReturnStatus(taxPeriod, status, zatcaReferenceNumber, updatedBy) {
  try {
    const response = await fetch(`${ENCORE_API_BASE_URL}/vatReturns/${taxPeriod}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taxPeriod, status, zatcaReferenceNumber, updatedBy }),
    });

    if (!response.ok) throw new Error('Failed to update VAT Return status');

    return await response.json();
  } catch (error) {
    console.error('Error updating VAT Return status:', error);
    throw error;
  }
}

// ===========================================================================
// Invoice API Functions
// ===========================================================================

export async function createInvoice(invoiceData) {
  try {
    console.log('📤 Creating invoice:', invoiceData);

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://staging-iotaapiserver-s572.encr.app/invoices',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify(invoiceData),
    };

    return axios
      .request(config)
      .then((response) => {
        console.log('✅ Invoice created successfully:', response.data);
        return response.data.invoice;
      })
      .catch((error) => {
        console.error('❌ Create invoice error:', error.response?.data || error.message);
        throw error;
      });
  } catch (error) {
    console.error('❌ Failed to create invoice:', error);
    throw error;
  }
}

// ✅ NEW: Fetch invoices from your Supabase database
export async function fetchInvoices() {
  try {
    const response = await axios.get('https://staging-iotaapiserver-s572.encr.app/invoices', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Fetched invoices from database:', response.data);
    return response.data.invoices || [];
  } catch (error) {
    console.error('❌ Failed to fetch invoices:', error.response?.data || error.message);
    return [];
  }
}

// Fetch single invoice by ID
export async function fetchInvoice(invoiceId) {
  try {
    const response = await axios.get(
      `https://staging-iotaapiserver-s572.encr.app/invoices/${invoiceId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Fetched invoice:', response.data);
    return response.data.invoice;
  } catch (error) {
    console.error('❌ Failed to fetch invoice:', error.response?.data || error.message);
    return null;
  }
}

export async function deleteInvoice(invoiceId) {
  try {
    const response = await axios.delete(
      `https://staging-iotaapiserver-s572.encr.app/invoices/${invoiceId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Invoice deleted:', invoiceId);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to delete invoice:', error.response?.data || error.message);
    throw error;
  }
}

// Update existing invoice
export async function updateInvoice(invoiceId, invoiceData) {
  try {
    console.log('📤 Updating invoice:', invoiceId, invoiceData);

    const response = await axios.patch(
      `https://staging-iotaapiserver-s572.encr.app/invoice/${invoiceId}`,
      invoiceData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Invoice updated successfully:', response.data);
    return response.data.invoice;
  } catch (error) {
    console.error('❌ Failed to update invoice:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================================================
// EMPLOYEE API FUNCTIONS
// ============================================================================

export async function getEmployees() {
  try {
    const response = await axios.get(`${API_BASE_URL}/employees`);
    return response.data.employees;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}

export async function getEmployeeById(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/employees/${id}`);
    return response.data.employee;
  } catch (error) {
    console.error('Error fetching employee:', error);
    throw error;
  }
}

export async function createEmployee(employeeData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/employees`, employeeData);
    return response.data.employee;
  } catch (error) {
    console.error('Error creating employee:', error);
    throw error;
  }
}

export async function updateEmployee(id, employeeData) {
  try {
    const response = await axios.patch(`${API_BASE_URL}/employees/${id}`, employeeData);
    return response.data.employee;
  } catch (error) {
    console.error(
      'Error updating employee:',
      error.response?.status,
      error.response?.data || error.message
    );
    throw error;
  }
}

export async function deleteEmployee(id) {
  try {
    const response = await axios.delete(`${API_BASE_URL}/employees/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting employee:', error);
    throw error;
  }
}

// ============================================================================
// BUSINESS VISA REQUEST API FUNCTIONS
// ============================================================================

export async function getBusinessVisaRequests() {
  try {
    const response = await axios.get(`${API_BASE_URL}/businessVisaRequests`);
    return response.data.requests;
  } catch (error) {
    console.error('Error fetching business visa requests:', error);
    throw error;
  }
}

export async function getBusinessVisaRequestById(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/businessVisaRequests/${id}`);
    return response.data.request;
  } catch (error) {
    console.error('Error fetching business visa request:', error);
    throw error;
  }
}

export async function createBusinessVisaRequest(requestData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/businessVisaRequests`, requestData);
    return response.data.request;
  } catch (error) {
    console.error('Error creating business visa request:', error);
    throw error;
  }
}

export async function updateBusinessVisaRequest(id, requestData) {
  try {
    const response = await axios.patch(`${API_BASE_URL}/businessVisaRequests/${id}`, requestData);
    return response.data.request;
  } catch (error) {
    console.error('Error updating business visa request:', error);
    throw error;
  }
}

export async function deleteBusinessVisaRequest(id) {
  try {
    const response = await axios.delete(`${API_BASE_URL}/businessVisaRequests/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting business visa request:', error);
    throw error;
  }
}

// ============================================================================
// LEAVE REQUEST API FUNCTIONS
// ============================================================================

export async function getLeaveRequests() {
  try {
    const response = await axios.get(`${API_BASE_URL}/leaveRequests`);
    return response.data.requests;
  } catch (error) {
    console.error('Error fetching leave requests:', error.response?.data || error.message);
    throw error;
  }
}

export async function getLeaveRequestById(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/leaveRequests/${id}`);
    return response.data.request;
  } catch (error) {
    console.error('Error fetching leave request:', error.response?.data || error.message);
    throw error;
  }
}

export async function createLeaveRequest(requestData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/leaveRequests`, requestData);
    return response.data.request;
  } catch (error) {
    console.error('Error creating leave request:', error.response?.data || error.message);
    throw error;
  }
}

export async function updateLeaveRequest(id, requestData) {
  try {
    const response = await axios.patch(`${API_BASE_URL}/leaveRequests/${id}`, requestData);
    return response.data.request;
  } catch (error) {
    console.error('Error updating leave request:', error.response?.data || error.message);
    throw error;
  }
}

export async function deleteLeaveRequest(id) {
  try {
    const response = await axios.delete(`${API_BASE_URL}/leaveRequests/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting leave request:', error.response?.data || error.message);
    throw error;
  }
}

// ---------------------------------------------------------------------------
// RBAC
// ---------------------------------------------------------------------------

export async function fetchRoles() {
  const response = await axios.get(`${API_BASE_URL}roles`);
  return response.data?.roles || response.data || [];
}

export async function setUserRoleApi({ id, roleId }) {
  if (!id || !roleId) throw new Error('id and roleId are required');
  const response = await axios.patch(
    `${API_BASE_URL}users?id=eq.${id}`,
    { roleId },
    { headers: { Prefer: 'return=representation' } }
  );
  return Array.isArray(response.data) ? response.data[0] : response.data;
}

export async function assignManagerApi({ managerId, userId }) {
  if (!managerId || !userId) throw new Error('managerId and userId are required');
  const response = await axios.post(
    '/api/rbac/manager-users',
    { managerId, userId },
    { headers: { Prefer: 'return=representation' } }
  );
  return Array.isArray(response.data) ? response.data[0] : response.data;
}

export async function fetchManagerUsers(managerId) {
  if (!managerId) return [];
  const response = await axios.get(
    `/api/rbac/manager-users?managerId=${encodeURIComponent(managerId)}`
  );
  return response.data || [];
}

// ---------------------------------------------------------------------------
// User Nav Permissions (Per-User Access Control)
// ---------------------------------------------------------------------------

export async function fetchNavPermissions() {
  const response = await axios.get(`${API_BASE_URL}nav-permissions`);
  return response.data?.permissions || [];
}

export async function fetchUserNavPermissions(userId) {
  if (!userId) return [];
  const response = await axios.get(
    `${API_BASE_URL}user-nav-permissions/${encodeURIComponent(userId)}`
  );
  return response.data?.permissions || [];
}

export async function fetchUserEnabledPaths(userId) {
  if (!userId) return [];
  const response = await axios.get(
    `${API_BASE_URL}user-nav-permissions/${encodeURIComponent(userId)}/paths`
  );
  return response.data?.paths || [];
}

export async function setUserNavPermissions({ userId, permissions, grantedBy }) {
  if (!userId) throw new Error('userId is required');
  const response = await axios.post(`${API_BASE_URL}user-nav-permissions/set`, {
    userId,
    permissions: permissions || [],
    grantedBy,
  });
  return response.data;
}

export async function grantDefaultPermissions({ userId, role, grantedBy }) {
  if (!userId || !role) throw new Error('userId and role are required');
  const response = await axios.post(`${API_BASE_URL}user-nav-permissions/grant-defaults`, {
    userId,
    role,
    grantedBy,
  });
  return response.data;
}

// =============================================
// Job Management API Functions
// =============================================

export async function getJobs(params = {}) {
  try {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.status) queryParams.append('status', params.status);
    if (params.jobType) queryParams.append('jobType', params.jobType);
    if (params.department) queryParams.append('department', params.department);
    if (params.isRemote !== undefined) queryParams.append('isRemote', params.isRemote);
    if (params.isFeatured !== undefined) queryParams.append('isFeatured', params.isFeatured);

    const url = `${API_BASE_URL}jobs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch jobs:', error.response?.data || error.message);
    throw error;
  }
}

export async function getJobById(id) {
  if (!id) return null;
  try {
    const response = await axios.get(`${API_BASE_URL}jobs/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to fetch job:', error.response?.data || error.message);
    throw error;
  }
}

export async function createJob(jobData) {
  try {
    const response = await axios.post(`${API_BASE_URL}jobs`, jobData, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to create job:', error.response?.data || error.message);
    throw error;
  }
}

export async function updateJob(id, jobData) {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}jobs/${id}`,
      { id, ...jobData },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to update job:', error.response?.data || error.message);
    throw error;
  }
}

export async function deleteJob(id) {
  try {
    const response = await axios.delete(`${API_BASE_URL}jobs/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete job:', error.response?.data || error.message);
    throw error;
  }
}

export async function syncJobToWebflow(jobId, publish = true) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}jobs/${jobId}/sync-to-webflow`,
      {
        jobId,
        publish,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to sync job to Webflow:', error.response?.data || error.message);
    throw error;
  }
}

export async function testWebflowConnection() {
  try {
    const response = await axios.get(`${API_BASE_URL}webflow/test`);
    return response.data;
  } catch (error) {
    console.error('Failed to test Webflow connection:', error.response?.data || error.message);
    throw error;
  }
}

export async function publishToWebflow() {
  try {
    const response = await axios.post(`${API_BASE_URL}webflow/publish`);
    return response.data;
  } catch (error) {
    console.error('Failed to publish to Webflow:', error.response?.data || error.message);
    throw error;
  }
}

export async function getIntegration(integrationName, integrationType) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}integrations/${integrationName}/${integrationType}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to fetch integration:', error.response?.data || error.message);
    throw error;
  }
}

export async function updateIntegration(integrationName, integrationType, data) {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}integrations/${integrationName}/${integrationType}`,
      { integrationName, integrationType, ...data },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to update integration:', error.response?.data || error.message);
    throw error;
  }
}

export async function getIntegrations(params = {}) {
  try {
    const response = await axios.get(`${API_BASE_URL}integrations`, { params });
    return response.data?.integrations || response.data || [];
  } catch (error) {
    console.error('Failed to fetch integrations:', error.response?.data || error.message);
    return [];
  }
}

export async function createIntegration(data) {
  try {
    const response = await axios.post(`${API_BASE_URL}integrations`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to create integration:', error.response?.data || error.message);
    throw error;
  }
}

export async function deleteIntegration(integrationName, integrationType) {
  try {
    await axios.delete(`${API_BASE_URL}integrations/${integrationName}/${integrationType}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete integration:', error.response?.data || error.message);
    throw error;
  }
}

export async function testIntegrationConnection(integrationName, integrationType) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}integrations/${integrationName}/${integrationType}/test`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to test integration:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================================================
// OFFER MANAGEMENT API FUNCTIONS
// ============================================================================

export async function getOffers() {
  try {
    const response = await axios.get(`${API_BASE_URL}/offers`);
    return response.data.offers;
  } catch (error) {
    console.error('Error fetching offers:', error);
    throw error;
  }
}

export async function getOffer(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/offers/${id}`);
    return response.data.offer;
  } catch (error) {
    console.error('Error fetching offer:', error);
    throw error;
  }
}

export async function createOffer(offerData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/offers`, offerData);
    return response.data.offer;
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
}

export async function updateOffer(id, offerData) {
  try {
    const response = await axios.patch(`${API_BASE_URL}/offers/${id}`, offerData);
    return response.data.offer;
  } catch (error) {
    console.error('Error updating offer:', error);
    throw error;
  }
}

export async function approveOffer(id, approvedBy, approvalComments) {
  try {
    const response = await axios.post(`${API_BASE_URL}/offers/${id}/approve`, {
      approvedBy,
      approvalComments: approvalComments || '',
    });
    return response.data.offer;
  } catch (error) {
    console.error('Error approving offer:', error);
    throw error;
  }
}

export async function rejectOffer(id, rejectedBy, rejectionReason) {
  try {
    const response = await axios.post(`${API_BASE_URL}/offers/${id}/reject`, {
      rejectedBy,
      rejectionReason,
    });
    return response.data.offer;
  } catch (error) {
    console.error('Error rejecting offer:', error);
    throw error;
  }
}

export async function commentOnOffer(id, commentedBy, comments) {
  try {
    const response = await axios.post(`${API_BASE_URL}/offers/${id}/comment`, {
      commentedBy,
      comments,
    });
    return response.data.offer;
  } catch (error) {
    console.error('Error commenting on offer:', error);
    throw error;
  }
}

export async function deleteOffer(id) {
  try {
    const response = await axios.delete(`${API_BASE_URL}/offers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting offer:', error);
    throw error;
  }
}

// ============================================================================
// NDA MANAGEMENT API FUNCTIONS
// ============================================================================

export async function getNdas() {
  try {
    const response = await axios.get(`${API_BASE_URL}ndas`);
    return response.data.ndas;
  } catch (error) {
    console.error('Error fetching NDAs:', error);
    throw error;
  }
}

export async function getNda(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}ndas/${id}`);
    return response.data.nda;
  } catch (error) {
    console.error('Error fetching NDA:', error);
    throw error;
  }
}

export async function getNdaByToken(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}ndas/sign/${token}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching NDA by token:', error);
    throw error;
  }
}

export async function createNda(ndaData) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas`, ndaData);
    return response.data.nda;
  } catch (error) {
    console.error('Error creating NDA:', error);
    throw error;
  }
}

export async function updateNda(id, ndaData) {
  try {
    const response = await axios.patch(`${API_BASE_URL}ndas/${id}`, ndaData);
    return response.data.nda;
  } catch (error) {
    console.error('Error updating NDA:', error);
    throw error;
  }
}

export async function submitNdaForIotaSigning(id, submittedBy) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/submit`, { submittedBy });
    return response.data.nda;
  } catch (error) {
    console.error('Error submitting NDA for signing:', error);
    throw error;
  }
}

export async function iotaSignNda(id, signatureData, signerEmail) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/iotaSign`, {
      signatureData,
      signerEmail,
    });
    return response.data.nda;
  } catch (error) {
    console.error('Error submitting IOTA signature:', error);
    throw error;
  }
}

export async function partnerSignNda(token, signatureData, ipAddress) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/sign/${token}`, {
      signatureData,
      ipAddress: ipAddress || '',
    });
    return response.data.nda;
  } catch (error) {
    console.error('Error submitting partner signature:', error);
    throw error;
  }
}

export async function finalizeNda(id, pdfBase64) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/finalize`, { pdfBase64 });
    return response.data.nda;
  } catch (error) {
    console.error('Error finalizing NDA:', error);
    throw error;
  }
}

export async function cancelNda(id, cancelledBy, reason) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/cancel`, { cancelledBy, reason });
    return response.data.nda;
  } catch (error) {
    console.error('Error cancelling NDA:', error);
    throw error;
  }
}

export async function uploadExternalNdaDocument(id, fileName, fileBase64) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/upload-document`, {
      id,
      fileName,
      fileBase64,
    });
    return response.data.nda;
  } catch (error) {
    console.error('Error uploading external NDA document:', error);
    throw error;
  }
}

export async function setNdaStampPlacements(id, stampPlacements) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/stamp-placements`, {
      id,
      stampPlacements,
    });
    return response.data.nda;
  } catch (error) {
    console.error('Error saving NDA stamp placements:', error);
    throw error;
  }
}

// ============================================================================
// WEBHOOK EVENTS API FUNCTIONS
// ============================================================================

export async function getWebhookEvents({
  source,
  eventType,
  status,
  fromDate,
  toDate,
  limit = 50,
  offset = 0,
} = {}) {
  try {
    const params = { limit, offset };
    if (source) params.source = source;
    if (eventType) params.eventType = eventType;
    if (status) params.status = status;
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    const response = await axios.get(`${API_BASE_URL}webhook/events`, { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch webhook events:', error.response?.data || error.message);
    return { events: [], total: 0 };
  }
}

export async function getLogDrainStatus() {
  try {
    const response = await axios.get(`${API_BASE_URL}webhook/log-drain/status`);
    return response.data;
  } catch (error) {
    console.error('Failed to get log drain status:', error.response?.data || error.message);
    return { enabled: false };
  }
}

export async function toggleLogDrain(enabled) {
  try {
    const response = await axios.post(`${API_BASE_URL}webhook/log-drain/toggle`, { enabled });
    return response.data;
  } catch (error) {
    console.error('Failed to toggle log drain:', error.response?.data || error.message);
    return { enabled: false };
  }
}

export const apiHelper = {
  fetchTotalIotaBilling,
  fetchTotalPartnerBilling,
  fetchZohoInvoices,
  getVendors,
  getCostCenters,
  getExpenseTypes,
  getInvoiceTypes,
  updateVendor,
  fetchCustomerPayments,
  createVendor,
  getCustomers,
  getExpenses,
  getExpensesWithLinkedInvoices,
  getExpense,
  createExpense,
  updateExpense,
  uploadExpenseAttachment,
  createInvoice,
  fetchInvoices,
  fetchInvoice,
  deleteInvoice,
  updateInvoice,
  getEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getBusinessVisaRequests,
  getBusinessVisaRequestById,
  createBusinessVisaRequest,
  updateBusinessVisaRequest,
  deleteBusinessVisaRequest,
  getLeaveRequests,
  getLeaveRequestById,
  createLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,
  getAccountsReceivable: fetchAccountsReceivable,
  fetchRoles,
  setUserRoleApi,
  assignManagerApi,
  fetchManagerUsers,
  fetchNavPermissions,
  fetchUserNavPermissions,
  fetchUserEnabledPaths,
  setUserNavPermissions,
  grantDefaultPermissions,
  // Job management
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  syncJobToWebflow,
  testWebflowConnection,
  publishToWebflow,
  // Integration management
  getIntegrations,
  getIntegration,
  createIntegration,
  updateIntegration,
  deleteIntegration,
  testIntegrationConnection,
  // Offer management
  getOffers,
  getOffer,
  createOffer,
  updateOffer,
  approveOffer,
  rejectOffer,
  commentOnOffer,
  deleteOffer,
  // Webhook events
  getWebhookEvents,
  getLogDrainStatus,
  toggleLogDrain,
  // NDA management
  getNdas,
  getNda,
  getNdaByToken,
  createNda,
  updateNda,
  submitNdaForIotaSigning,
  iotaSignNda,
  partnerSignNda,
  finalizeNda,
  cancelNda,
  uploadExternalNdaDocument,
  setNdaStampPlacements,
};
