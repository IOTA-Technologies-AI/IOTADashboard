const axios = require('axios');

const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app/';
const API_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2c2ZrcXB2dXRmYm15cWVoc3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzM2OTMsImV4cCI6MjA1MTI0OTY5M30.DeNT5NU3w_ayehNfJEZysbKS0SkDq19z5kDRniPyh7o';
const AUTH_TOKEN =
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2c2ZrcXB2dXRmYm15cWVoc3dqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU2NzM2OTMsImV4cCI6MjA1MTI0OTY5M30.DeNT5NU3w_ayehNfJEZysbKS0SkDq19z5kDRniPyh7o';

const PARTER_API_BASE_URL = 'https://staging-iwtapiserver-6x92.encr.app/getTotalInvoiceAmounts';
const PARTER_AUTH_TOKEN = 'Bearer dGVzdEB0ZXN0LmNvbTpwYXN29yZDEyMyE=';

async function fetchTotalIotaBilling() {
  try {
    const response = await fetch(`${API_BASE_URL}/expenses?select=expenseAmount.sum()`, {
      headers: {
        apikey: API_KEY,
        Authorization: AUTH_TOKEN,
      },
    });
    const data = await response.json();
    return data[0]?.sum || 0; // Return the sum value
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
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://staging-iotaapiserver-s572.encr.app/expenses',
      headers: {},
    };

    return axios
      .request(config)
      .then((response) => {
        const expenses = response.data.expenses || [];
        return expenses;
      })
      .catch((error) => {
        console.error('❌ Expenses API error:', error.response?.data || error.message);
        return [];
      });
  } catch (error) {
    console.error('❌ Failed to fetch expenses:', error);
    return [];
  }
}

export async function getExpense(referenceId) {
  try {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://staging-iotaapiserver-s572.encr.app/expenses/${referenceId}`,
      headers: {},
    };

    return axios
      .request(config)
      .then((response) => response.data.expense)
      .catch((error) => {
        console.error('❌ Expense API error:', error.response?.data || error.message);
        return null;
      });
  } catch (error) {
    console.error('❌ Failed to fetch expense:', error);
    return null;
  }
}

// Get expenses with linked invoices (expenseType 18) - for deals
export async function getExpensesWithLinkedInvoices() {
  try {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: 'https://staging-iotaapiserver-s572.encr.app/expenses',
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

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://staging-iotaapiserver-s572.encr.app/expenses',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify(expenseData),
    };

    return axios
      .request(config)
      .then((response) => {
        console.log('✅ Expense created successfully:', response.data);
        return response.data.expense;
      })
      .catch((error) => {
        console.error('❌ Create expense error:', error.response?.data || error.message);
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

    const jsonString = JSON.stringify(expenseData);
    console.log('📤 JSON string being sent:', jsonString);

    let config = {
      method: 'patch',
      maxBodyLength: Infinity,
      url: `https://staging-iotaapiserver-s572.encr.app/expenses/${referenceId}`,
      headers: {
        'Content-Type': 'application/json',
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
        throw error;
      });
  } catch (error) {
    console.error('❌ Failed to update expense:', error);
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

export const apiHelper = {
  fetchTotalIotaBilling,
  fetchTotalPartnerBilling,
  fetchZohoInvoices,
  getVendors,
  updateVendor,
  fetchCustomerPayments,
  createVendor,
  getCustomers,
  getExpenses,
  getExpensesWithLinkedInvoices,
  getExpense,
  createExpense,
  updateExpense,
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
};
