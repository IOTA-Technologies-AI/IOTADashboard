const axios = require('axios');

import { decodeJWT, extractJWTFromSession } from './jwt-auth';

const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app/';

const PARTER_API_BASE_URL = 'https://staging-iwtapiserver-6x92.encr.app/getTotalInvoiceAmounts';
const PARTER_AUTH_TOKEN = 'Bearer dGVzdEB0ZXN0LmNvbTpwYXN29yZDEyMyE=';

/**
 * @summary Builds the Authorization header containing the JWT bearer token.
 * @description Extracts the current session JWT and returns an object suitable for
 * passing as Axios `headers`. Returns an empty object when no token is found.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {{ Authorization?: string }} Header object with Bearer token, or empty object.
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
 * @summary Retrieves the current user's context (email, role, roleId) for API permission checks.
 * @description Reads from localStorage first (set by the auth provider on sign-in), then
 * falls back to decoding the JWT directly. Returns null when running server-side (SSR).
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {{ userEmail: string, role: string, roleId: number } | null} User context or null.
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

/**
 * @summary Fetches a single expense record by its database row ID.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The expense's primary key (row ID).
 * @returns {Promise<object|null>} The expense object, or null if not found or id is falsy.
 */
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

/**
 * @summary Fetches a single expense by its human-readable expenseId reference.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The human-readable expense reference ID.
 * @returns {Promise<object|null>} The expense object, or null if not found or id is falsy.
 */
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

/**
 * @summary Fetches a single expense by referenceId, enforcing user-level permission checks.
 * @description Passes the authenticated user's context as query params so the backend can
 * apply row-level security. Throws a PERMISSION_DENIED error on HTTP 403.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} referenceId - The expense's referenceId (e.g. "EXP-0001").
 * @returns {Promise<object|null>} The expense object or null.
 */
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

/**
 * @summary Calculates the total billing amount across all IOTA expenses.
 * @description Fetches all expenses and sums `expenseAmount` (or `amount` as fallback).
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<number>} The total billing amount.
 */
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

/**
 * @summary Fetches the total paid and pending billing amounts from the partner API.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} invoicePeriod - The billing period string (e.g. "2024-Q1").
 * @returns {Promise<{ totalPaid: number, totalPending: number }>} Partner billing totals.
 */
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

/**
 * @summary Retrieves all invoices from the Zoho-integrated invoices endpoint.
 * @description Non-critical: returns an empty structure on failure to avoid breaking the dashboard.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of invoice objects, or empty array on error.
 */
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

/**
 * @summary Retrieves all customer payment records.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of customer payment objects.
 */
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

/**
 * @summary Retrieves the full list of customers.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of customer objects.
 */
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

/**
 * @summary Creates a new customer record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} data - Customer fields to create.
 * @returns {Promise<object>} The newly created customer object.
 */
export async function createCustomer(data) {
  try {
    const config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: 'https://staging-iotaapiserver-s572.encr.app/customers',
      headers: { 'Content-Type': 'application/json' },
      data,
    };
    const response = await axios.request(config);
    return response.data.customer;
  } catch (error) {
    console.error('Failed to create customer:', error);
    throw error;
  }
}

/**
 * @summary Retrieves all vendor records, mapping backend field names to frontend aliases.
 * @description Maps: phone→phoneNumber, primaryContactName→contactPerson, swiftCode→bankSwiftCode.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of vendor objects with mapped field names, or empty array on error.
 */
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

/**
 * @summary Fetches the list of cost centers. Uses a Next.js proxy route on the client to avoid CORS.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of cost center objects, or empty array on error.
 */
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

/**
 * @summary Fetches the list of expense types. Uses a Next.js proxy route on the client to avoid CORS.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of expense type objects, or empty array on error.
 */
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

/**
 * @summary Fetches the list of invoice types. Uses a Next.js proxy route on the client to avoid CORS.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of invoice type objects, or empty array on error.
 */
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

/**
 * @summary Fetches the list of VAT rate configurations. Uses a Next.js proxy route on the client to avoid CORS.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of VAT config objects, or empty array on error.
 */
export async function getVatConfigs() {
  try {
    const isClient = typeof window !== 'undefined';
    const url = isClient ? '/api/vatconfigs' : `${API_BASE_URL}vatconfigs`;
    const response = await axios.get(url);
    const list = response.data?.vatConfigs || response.data?.data || response.data || [];
    return Array.isArray(list) ? list : [];
  } catch (error) {
    console.warn('⚠️ VAT configs fetch failed:', error.response?.status, error.message);
    return [];
  }
}

/**
 * @summary Fetches office location configurations from the appconfigs table.
 * @description Returns null on error so callers fall back to the hardcoded IOTA_OFFICES constant.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]|null>} Array of office config objects merged with configKey/label, or null on failure.
 */
export async function fetchOfficeConfigs() {
  try {
    const isClient = typeof window !== 'undefined';
    const url = isClient
      ? '/api/appconfigs?namespace=iotaOffice'
      : `${API_BASE_URL}appconfigs?namespace=iotaOffice`;
    const response = await axios.get(url);
    const list = response.data?.configs || [];
    // Map each config row to the same shape as IOTA_OFFICES entries
    return list.map((c) => ({ ...c.configValue, id: c.configKey, label: c.label }));
  } catch (error) {
    console.warn('⚠️ Office configs fetch failed:', error.response?.status, error.message);
    return null; // null signals caller to fall back to IOTA_OFFICES
  }
}

/**
 * @summary Fetches all payroll run records.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of payroll run objects.
 */
export async function fetchPayrollRuns() {
  const url = `${API_BASE_URL}/payroll/runs`;
  const response = await axios.get(url);
  return response.data?.payrollRuns || [];
}

/**
 * @summary Fetches a single payroll run by its ID.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The payroll run ID.
 * @returns {Promise<object>} The payroll run object.
 */
export async function fetchPayrollRun(id) {
  const url = `${API_BASE_URL}/payroll/runs/${id}`;
  const response = await axios.get(url);
  return response.data;
}

/**
 * @summary Creates a new payroll run.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} body - Payroll run fields (pay period, employees, etc.).
 * @returns {Promise<object>} The created payroll run object.
 */
export async function createPayrollRun(body) {
  const url = `${API_BASE_URL}/payroll/runs`;
  const response = await axios.post(url, body);
  return response.data;
}

/**
 * @summary Triggers bank processing for a finalised payroll run.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The payroll run ID.
 * @returns {Promise<object>} The updated payroll run object.
 */
export async function postPayrollToBank(id) {
  const url = `${API_BASE_URL}/payroll/runs/${id}/process`;
  const response = await axios.post(url);
  return response.data;
}

/**
 * @summary Approves or rejects a payroll run.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ id: string|number, approvedBy: string, status: string, notes?: string }} params - Approval payload.
 * @returns {Promise<object>} The updated payroll run object.
 */
export async function approvePayrollRun({ id, approvedBy, status, notes }) {
  const url = `${API_BASE_URL}/payroll/runs/${id}/approve`;
  const response = await axios.post(url, {
    approvedBy,
    status,
    notes,
  });
  return response.data;
}

/**
 * @summary Updates manual deduction amount and remarks on a single payroll line item.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The payroll line item ID.
 * @param {{ manualDeductionAmount: number, manualDeductionRemarks: string }} params - Deduction update payload.
 * @returns {Promise<object>} The updated line item.
 */
export async function updatePayrollLineItemDeductions(
  id,
  { manualDeductionAmount, manualDeductionRemarks }
) {
  const url = `${API_BASE_URL}/payroll/line-items/${id}`;
  const response = await axios.patch(url, { manualDeductionAmount, manualDeductionRemarks });
  return response.data;
}

/**
 * @summary Updates an existing vendor record by ID.
 * @description Sends a PATCH request with the vendor ID both in the URL path and the request body
 * as required by the Encore backend.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The vendor's primary key.
 * @param {object} vendorData - Vendor fields to update.
 * @returns {Promise<object>} The updated vendor object.
 */
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

/**
 * @summary Creates a new vendor record, mapping frontend field aliases to backend column names.
 * @description Maps: phoneNumber→phone, contactPerson→primaryContactName, bankSwiftCode→swiftCode.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} vendorData - Vendor fields to create (using frontend field names).
 * @returns {Promise<object>} The newly created vendor object.
 */
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

/**
 * @summary Retrieves expenses that are linked to invoices (expenseType 18 — Invoice Against Invoice).
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of linked expense objects, or empty array on error.
 */
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

/**
 * @summary Creates a new expense record, attaching user context for permission validation.
 * @description Merges user context into the payload before sending. Throws if no user session exists.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} expenseData - Expense fields to create.
 * @returns {Promise<object>} The newly created expense object.
 */
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

/**
 * @summary Updates an existing expense record by referenceId.
 * @description Merges user context into the payload for server-side permission checks.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} referenceId - The expense referenceId (e.g. "EXP-0001").
 * @param {object} expenseData - Fields to update on the expense.
 * @returns {Promise<object>} The updated expense object.
 */
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

export async function deleteExpense(referenceId) {
  try {
    const userContext = getUserContext();
    if (!userContext) throw new Error('No user context — please sign in again.');

    const authHeaders = getAuthHeaders();
    const response = await axios.delete(`${API_BASE_URL}expenses/${referenceId}`, {
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      data: { referenceId, ...userContext },
    });

    if (response.status !== 200 && response.status !== 204) {
      throw new Error(`Unexpected status ${response.status}`);
    }
    return true;
  } catch (error) {
    console.error('❌ Failed to delete expense:', error);
    if (error.response?.status === 403) {
      throw new Error(
        error.response?.data?.message || 'You do not have permission to delete this expense.'
      );
    }
    if (error.response?.status === 401) {
      throw new Error('Authentication required. Please sign in again.');
    }
    throw error;
  }
}

/**
 * @summary Uploads an expense attachment file to OneDrive.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ folderPath: string, fileName: string, fileContent: string, userId: string }} params - Upload parameters.
 * @returns {Promise<object>} Upload result containing the OneDrive file URL and path.
 */
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

// ============================================================================
// Wallet Management APIs
// ============================================================================

const WALLET_API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app';

/**
 * @summary Returns all employee wallets (admin-level overview).
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of wallet objects.
 */
export async function getWallets() {
  try {
    const response = await axios.get(`${WALLET_API_BASE_URL}/wallet`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data?.wallets ?? [];
  } catch (error) {
    console.error('❌ getWallets error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Returns a single employee wallet by employee ID.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} employeeId - The employee's ID.
 * @returns {Promise<object|null>} The wallet object, or null if not found.
 */
export async function getWallet(employeeId) {
  try {
    const response = await axios.get(
      `${WALLET_API_BASE_URL}/wallet/${encodeURIComponent(employeeId)}`,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
    return response.data?.wallet ?? null;
  } catch (error) {
    console.error('❌ getWallet error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Returns all wallet transactions for an employee, ordered newest first.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} employeeId - The employee's ID.
 * @returns {Promise<object[]>} Array of transaction objects.
 */
export async function getWalletTransactions(employeeId) {
  try {
    const response = await axios.get(
      `${WALLET_API_BASE_URL}/wallet/${encodeURIComponent(employeeId)}/transactions`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data?.transactions ?? [];
  } catch (error) {
    console.error('❌ getWalletTransactions error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Credits funds to an employee wallet; auto-creates the wallet on first top-up.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ employeeId: string, employeeName: string, employeeEmail: string, amount: number, currency?: string, description?: string, performedBy: string }} data - Top-up payload.
 * @returns {Promise<object>} The updated wallet and transaction record.
 */
export async function topUpWallet(data) {
  try {
    const response = await axios.post(`${WALLET_API_BASE_URL}/wallet/top-up`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('❌ topUpWallet error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Deducts an approved wallet-payment expense from the employee's balance.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ employeeId: string, amount: number, currency?: string, description?: string, expenseReferenceId?: string, performedBy: string }} data - Deduction payload.
 * @returns {Promise<object>} The updated wallet and transaction record.
 */
export async function deductFromWallet(data) {
  try {
    const response = await axios.post(`${WALLET_API_BASE_URL}/wallet/deduct`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('❌ deductFromWallet error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Manually credits or debits an employee wallet as a correction or adjustment.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ employeeId: string, direction: 'credit'|'debit', amount: number, currency?: string, description?: string, performedBy: string }} data - Adjustment payload.
 * @returns {Promise<object>} The updated wallet and transaction record.
 */
export async function adjustWallet(data) {
  try {
    const response = await axios.post(`${WALLET_API_BASE_URL}/wallet/adjust`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('❌ adjustWallet error:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================================================
// Employee ID Management APIs
// ============================================================================

/**
 * @summary Lists employee ID records, optionally filtered by country, status, or expiry window.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ country?: string, status?: string, expiringSoonDays?: number }} [params] - Optional filter parameters.
 * @returns {Promise<object>} Paginated list response containing employee ID records.
 */
export async function listEmployeeIds(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.country) query.set('country', params.country);
    if (params.status) query.set('status', params.status);
    if (params.expiringSoonDays) query.set('expiringSoonDays', params.expiringSoonDays);
    const response = await axios.get(
      `${API_BASE_URL}employee-ids${query.toString() ? '?' + query.toString() : ''}`,
      { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ listEmployeeIds error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Fetches a single employee ID record by its primary key.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The employee ID record's primary key.
 * @returns {Promise<object>} The employee ID record.
 */
export async function getEmployeeIdRecord(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}employee-ids/${id}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ getEmployeeIdRecord error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Updates an employee ID record by its primary key.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The employee ID record's primary key.
 * @param {object} data - Fields to update.
 * @returns {Promise<object>} The updated employee ID record.
 */
export async function updateEmployeeId(id, data) {
  try {
    const response = await axios.patch(`${API_BASE_URL}employee-ids/${id}`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ updateEmployeeId error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Returns employee ID records expiring within the specified number of days.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {number} [days] - Look-ahead window in days (defaults to backend default if omitted).
 * @returns {Promise<object>} Response containing expiring document records.
 */
export async function getExpiringDocuments(days) {
  try {
    const query = days ? `?days=${days}` : '';
    const response = await axios.get(`${API_BASE_URL}employee-ids/expiring${query}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ getExpiringDocuments error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Returns a compliance dashboard summary for employee ID documents.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object>} Dashboard summary including counts of valid, expiring, and expired documents.
 */
export async function getComplianceDashboard() {
  try {
    const response = await axios.get(`${API_BASE_URL}employee-ids/compliance-dashboard`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ getComplianceDashboard error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Fetches SCE (Saudi Council of Engineers) membership records for an employee.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} employeeId - The employee's ID.
 * @returns {Promise<object[]>} Array of SCE membership objects.
 */
export async function getSceMemberships(employeeId) {
  try {
    const response = await axios.get(`${API_BASE_URL}employee-ids/${employeeId}/sce`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data?.memberships ?? [];
  } catch (error) {
    console.error('❌ getSceMemberships error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Creates a new SCE membership record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} data - SCE membership fields.
 * @returns {Promise<object>} The created membership record.
 */
export async function createSceMembership(data) {
  try {
    const response = await axios.post(`${API_BASE_URL}employee-ids/sce`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ createSceMembership error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Updates an existing SCE membership record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The SCE membership record ID.
 * @param {object} data - Fields to update.
 * @returns {Promise<object>} The updated membership record.
 */
export async function updateSceMembership(id, data) {
  try {
    const response = await axios.patch(`${API_BASE_URL}employee-ids/sce/${id}`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ updateSceMembership error:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================================================
// Insurance Management APIs
// ============================================================================

/**
 * @summary Lists insurance records with optional filters for employee, status, provider, or expiry window.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ employeeId?: string, status?: string, providerId?: string, expiringSoonDays?: number }} [params] - Optional filter parameters.
 * @returns {Promise<object>} Paginated list response containing insurance records.
 */
export async function listInsuranceRecords(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.employeeId) query.set('employeeId', params.employeeId);
    if (params.status) query.set('status', params.status);
    if (params.providerId) query.set('providerId', params.providerId);
    if (params.expiringSoonDays) query.set('expiringSoonDays', params.expiringSoonDays);
    const response = await axios.get(
      `${API_BASE_URL}insurance/records${query.toString() ? '?' + query.toString() : ''}`,
      { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ listInsuranceRecords error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Fetches a single insurance record by its primary key.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The insurance record ID.
 * @returns {Promise<object>} The insurance record.
 */
export async function getInsuranceRecord(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}insurance/records/${id}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ getInsuranceRecord error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Creates a new insurance record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} data - Insurance record fields (employeeId, providerId, startDate, endDate, etc.).
 * @returns {Promise<object>} The created insurance record.
 */
export async function createInsuranceRecord(data) {
  try {
    const response = await axios.post(`${API_BASE_URL}insurance/records`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ createInsuranceRecord error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Updates an existing insurance record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The insurance record ID.
 * @param {object} data - Fields to update.
 * @returns {Promise<object>} The updated insurance record.
 */
export async function updateInsuranceRecord(id, data) {
  try {
    const response = await axios.patch(`${API_BASE_URL}insurance/records/${id}`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ updateInsuranceRecord error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Fetches all dependents linked to a specific insurance record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} recordId - The insurance record ID.
 * @returns {Promise<object[]>} Array of dependent objects.
 */
export async function listDependents(recordId) {
  try {
    const response = await axios.get(`${API_BASE_URL}insurance/records/${recordId}/dependents`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data?.dependents ?? [];
  } catch (error) {
    console.error('❌ listDependents error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Creates a new insurance dependent record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} data - Dependent fields including recordId, name, relationship, dateOfBirth, etc.
 * @returns {Promise<object>} The created dependent record.
 */
export async function createDependent(data) {
  try {
    const response = await axios.post(`${API_BASE_URL}insurance/dependents`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ createDependent error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Updates an existing insurance dependent record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The dependent record ID.
 * @param {object} data - Fields to update.
 * @returns {Promise<object>} The updated dependent record.
 */
export async function updateDependent(id, data) {
  try {
    const response = await axios.patch(`${API_BASE_URL}insurance/dependents/${id}`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ updateDependent error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Fetches all insurance providers, optionally limited to active providers only.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {boolean} [activeOnly=false] - When true, only returns active providers.
 * @returns {Promise<object[]>} Array of insurance provider objects.
 */
export async function listInsuranceProviders(activeOnly = false) {
  try {
    const query = activeOnly ? '?activeOnly=true' : '';
    const response = await axios.get(`${API_BASE_URL}insurance/providers${query}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data?.providers ?? [];
  } catch (error) {
    console.error('❌ listInsuranceProviders error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Creates a new insurance provider record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} data - Provider fields (name, contactEmail, phone, isActive, etc.).
 * @returns {Promise<object>} The created insurance provider record.
 */
export async function createInsuranceProvider(data) {
  try {
    const response = await axios.post(`${API_BASE_URL}insurance/providers`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ createInsuranceProvider error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Updates an existing insurance provider record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The insurance provider record ID.
 * @param {object} data - Fields to update.
 * @returns {Promise<object>} The updated insurance provider record.
 */
export async function updateInsuranceProvider(id, data) {
  try {
    const response = await axios.patch(`${API_BASE_URL}insurance/providers/${id}`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ updateInsuranceProvider error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Returns insurance dashboard statistics (coverage counts, expiring policies, etc.).
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object>} Insurance dashboard statistics object.
 */
export async function getInsuranceDashboard() {
  try {
    const response = await axios.get(`${API_BASE_URL}insurance/dashboard`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ getInsuranceDashboard error:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================================================
// Employee Requests Management APIs
// ============================================================================

/**
 * @summary Lists employee requests with optional filters for employee, status, type, and pagination.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ employeeId?: string, status?: string, requestTable?: string, limit?: number, offset?: number }} [params] - Optional filter and pagination parameters.
 * @returns {Promise<object>} Paginated list response containing request records.
 */
export async function listRequests(params = {}) {
  try {
    const query = new URLSearchParams();
    if (params.employeeId) query.set('employeeId', params.employeeId);
    if (params.status) query.set('status', params.status);
    if (params.requestTable) query.set('requestTable', params.requestTable);
    if (params.limit) query.set('limit', params.limit);
    if (params.offset) query.set('offset', params.offset);
    const response = await axios.get(
      `${API_BASE_URL}employee-requests${query.toString() ? '?' + query.toString() : ''}`,
      { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ listRequests error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Fetches a single request together with its full approvals chain.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} requestTable - The request type table name (e.g. "visa", "service").
 * @param {string|number} id - The request record ID.
 * @returns {Promise<object>} The request record with nested approvals.
 */
export async function getRequestWithApprovals(requestTable, id) {
  try {
    const response = await axios.get(`${API_BASE_URL}employee-requests/${requestTable}/${id}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ getRequestWithApprovals error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Submits a new visa request for an employee.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} data - Visa request fields (employeeId, visaType, destination, etc.).
 * @returns {Promise<object>} The created visa request record.
 */
export async function createVisaRequest(data) {
  try {
    const response = await axios.post(`${API_BASE_URL}employee-requests/visa`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ createVisaRequest error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Updates an existing visa request.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The visa request ID.
 * @param {object} data - Fields to update.
 * @returns {Promise<object>} The updated visa request record.
 */
export async function updateVisaRequest(id, data) {
  try {
    const response = await axios.patch(`${API_BASE_URL}employee-requests/visa/${id}`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ updateVisaRequest error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Submits a new service request for an employee.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} data - Service request fields (employeeId, serviceType, description, etc.).
 * @returns {Promise<object>} The created service request record.
 */
export async function createServiceRequest(data) {
  try {
    const response = await axios.post(`${API_BASE_URL}employee-requests/service`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ createServiceRequest error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Updates an existing service request.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The service request ID.
 * @param {object} data - Fields to update.
 * @returns {Promise<object>} The updated service request record.
 */
export async function updateServiceRequest(id, data) {
  try {
    const response = await axios.patch(`${API_BASE_URL}employee-requests/service/${id}`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ updateServiceRequest error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Submits a new reimbursement request for an employee.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} data - Reimbursement request fields (employeeId, amount, category, receipts, etc.).
 * @returns {Promise<object>} The created reimbursement request record.
 */
export async function createReimbursementRequest(data) {
  try {
    const response = await axios.post(`${API_BASE_URL}employee-requests/reimbursement`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ createReimbursementRequest error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Updates an existing reimbursement request.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The reimbursement request ID.
 * @param {object} data - Fields to update.
 * @returns {Promise<object>} The updated reimbursement request record.
 */
export async function updateReimbursementRequest(id, data) {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}employee-requests/reimbursement/${id}`,
      data,
      { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ updateReimbursementRequest error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Submits an approval decision (approve or reject) for a pending employee request.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ requestTable: string, requestId: string|number, approverEmail: string, decision: 'approved'|'rejected', comments?: string }} data - Approval payload.
 * @returns {Promise<object>} The updated request record with new approval status.
 */
export async function submitApproval(data) {
  try {
    const response = await axios.post(`${API_BASE_URL}employee-requests/approve`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ submitApproval error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Fetches all requests pending approval for a specific approver.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} approverEmail - The approver's email address.
 * @returns {Promise<object>} Pending approvals list grouped by request type.
 */
export async function listPendingApprovals(approverEmail) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}employee-requests/pending-approvals?approverEmail=${encodeURIComponent(approverEmail)}`,
      { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ listPendingApprovals error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Retrieves the HR audit log, optionally scoped to a specific entity type and ID.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ entityType?: string, entityId?: string|number, limit?: number, offset?: number }} [params] - Filter and pagination options.
 * @returns {Promise<object>} Audit log entries matching the given filters.
 */
export async function getAuditLog({ entityType, entityId, limit = 100, offset = 0 } = {}) {
  try {
    const params = new URLSearchParams();
    if (entityType) params.append('entityType', entityType);
    if (entityId) params.append('entityId', String(entityId));
    params.append('limit', String(limit));
    params.append('offset', String(offset));
    const response = await axios.get(`${API_BASE_URL}hr-audit-log?${params.toString()}`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ getAuditLog error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Returns a dashboard summary of employee requests (counts by status and type).
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object>} Dashboard statistics for employee requests.
 */
export async function getRequestsDashboard() {
  try {
    const response = await axios.get(`${API_BASE_URL}employee-requests/dashboard`, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ getRequestsDashboard error:', error.response?.data || error.message);
    throw error;
  }
}

// ─── Travel Ticket Requests ───────────────────────────────────────────────────

/**
 * @summary Submits a new travel ticket request for an employee.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} data - Travel request fields (employeeId, origin, destination, travelDate, etc.).
 * @returns {Promise<object>} The created travel request record.
 */
export async function createTravelRequest(data) {
  try {
    const response = await axios.post(`${API_BASE_URL}employee-requests/travel`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ createTravelRequest error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Updates an existing travel ticket request.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The travel request ID.
 * @param {object} data - Fields to update.
 * @returns {Promise<object>} The updated travel request record.
 */
export async function updateTravelRequest(id, data) {
  try {
    const response = await axios.patch(`${API_BASE_URL}employee-requests/travel/${id}`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ updateTravelRequest error:', error.response?.data || error.message);
    throw error;
  }
}

// ─── Letter Requests ─────────────────────────────────────────────────────────

/**
 * @summary Submits a new HR letter request (salary certificate, NOC, experience letter, etc.).
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} data - Letter request fields (employeeId, letterType, addressedTo, etc.).
 * @returns {Promise<object>} The created letter request record.
 */
export async function createLetterRequest(data) {
  try {
    const response = await axios.post(`${API_BASE_URL}employee-requests/letter`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ createLetterRequest error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Updates an existing HR letter request.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The letter request ID.
 * @param {object} data - Fields to update.
 * @returns {Promise<object>} The updated letter request record.
 */
export async function updateLetterRequest(id, data) {
  try {
    const response = await axios.patch(`${API_BASE_URL}employee-requests/letter/${id}`, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    console.error('❌ updateLetterRequest error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Uploads a document file (base64-encoded) to cloud storage.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ fileBase64: string, fileName: string, mimeType: string, folder?: string }} params - Upload parameters.
 * @returns {Promise<{ url: string, path: string }>} The uploaded file's URL and storage path.
 */
export async function uploadDocument({ fileBase64, fileName, mimeType, folder }) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}documents/upload`,
      { fileBase64, fileName, mimeType, folder: folder || 'misc' },
      { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } }
    );
    return response.data; // { url, path }
  } catch (error) {
    console.error('❌ uploadDocument error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Generates an HTML salary certificate document for the specified employee.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} employeeId - The employee's ID.
 * @returns {Promise<{ html: string, fileName: string }>} The rendered HTML and suggested file name.
 */
export async function generateSalaryCertificate(employeeId) {
  try {
    const response = await axios.get(`${API_BASE_URL}documents/salary-certificate/${employeeId}`, {
      headers: getAuthHeaders(),
    });
    return response.data; // { html, fileName }
  } catch (error) {
    console.error('❌ generateSalaryCertificate error:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Generates an HTML document for a previously submitted letter request.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} letterId - The letter request ID.
 * @returns {Promise<{ html: string, fileName: string }>} The rendered HTML and suggested file name.
 */
export async function generateLetterDocument(letterId) {
  try {
    const response = await axios.get(`${API_BASE_URL}documents/generate-letter/${letterId}`, {
      headers: getAuthHeaders(),
    });
    return response.data; // { html, fileName }
  } catch (error) {
    console.error('❌ generateLetterDocument error:', error.response?.data || error.message);
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

/**
 * @summary Fetches all accounts-receivable records.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object>} Accounts-receivable data from the Encore API.
 */
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

/**
 * @summary Fetches accounts-receivable records within a specified date range.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} startDate - ISO date string for the range start (e.g. "2024-01-01").
 * @param {string} endDate - ISO date string for the range end (e.g. "2024-12-31").
 * @returns {Promise<object>} Filtered accounts-receivable data.
 */
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

/**
 * @summary Fetches all accounts-payable records.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object>} Accounts-payable data from the Encore API.
 */
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

/**
 * @summary Fetches accounts-payable records within a specified date range.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} startDate - ISO date string for the range start.
 * @param {string} endDate - ISO date string for the range end.
 * @returns {Promise<object>} Filtered accounts-payable data.
 */
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

/**
 * @summary Fetches all VAT transaction records.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object>} All VAT transaction records from the Encore API.
 */
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

/**
 * @summary Fetches VAT transaction records within a specified date range.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} startDate - ISO date string for the range start.
 * @param {string} endDate - ISO date string for the range end.
 * @returns {Promise<object>} Filtered VAT transaction records.
 */
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

/**
 * @summary Fetches VAT transaction records for a specific tax period.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} taxPeriod - The ZATCA tax period identifier (e.g. "2024-Q1").
 * @returns {Promise<object>} VAT transactions for the specified period.
 */
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

/**
 * @summary Posts (locks) VAT transactions for a given quarter for ZATCA filing.
 * @description Once posted, VAT transactions for the period are immutable.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {number} year - The fiscal year (e.g. 2024).
 * @param {number} quarter - The quarter number (1–4).
 * @param {string} postedBy - Email address of the user posting the VAT.
 * @returns {Promise<object>} Confirmation with the posting summary.
 */
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

/**
 * @summary Gets the VAT posting status (posted/unposted) for a given year and quarter.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {number} year - The fiscal year (e.g. 2024).
 * @param {number} quarter - The quarter number (1–4).
 * @returns {Promise<object>} Object containing the posting status for the period.
 */
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

/**
 * @summary Retrieves the VAT summary (totals, net VAT payable) for a given year and quarter.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {number} year - The fiscal year (e.g. 2024).
 * @param {number} quarter - The quarter number (1–4).
 * @returns {Promise<object>} VAT summary object including output/input VAT totals.
 */
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

/**
 * @summary Saves a completed VAT Return summary to the database for record-keeping.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} vatReturnData - The VAT return data including taxPeriod, totals, and submittedBy.
 * @returns {Promise<object>} The saved VAT return record.
 */
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

/**
 * @summary Fetches all saved VAT return records.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object>} All VAT return records.
 */
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

/**
 * @summary Fetches the VAT return record for a specific tax period.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} taxPeriod - The ZATCA tax period identifier (e.g. "2024-Q1").
 * @returns {Promise<object>} The VAT return record for that period.
 */
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

/**
 * @summary Updates the status of a VAT return (e.g. submitted to ZATCA) and records the ZATCA reference number.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} taxPeriod - The ZATCA tax period identifier.
 * @param {string} status - The new status (e.g. "submitted", "accepted").
 * @param {string} zatcaReferenceNumber - The ZATCA submission reference number.
 * @param {string} updatedBy - Email address of the user making the update.
 * @returns {Promise<object>} The updated VAT return record.
 */
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

/**
 * @summary Creates a new invoice record in the system.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} invoiceData - Invoice fields (customerId, lineItems, dueDate, currency, etc.).
 * @returns {Promise<object>} The created invoice object.
 */
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

/**
 * @summary Fetches all invoice records from the Supabase database.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of invoice objects, or empty array on error.
 */
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

/**
 * @summary Fetches a single invoice record by its ID.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} invoiceId - The invoice's ID.
 * @returns {Promise<object|null>} The invoice object, or null if not found.
 */
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

/**
 * @summary Permanently deletes an invoice by its ID.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} invoiceId - The invoice's ID.
 * @returns {Promise<object>} Deletion confirmation response.
 */
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

/**
 * @summary Updates an existing invoice with new data.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} invoiceId - The invoice's ID.
 * @param {object} invoiceData - Fields to update on the invoice.
 * @returns {Promise<object>} The updated invoice object.
 */
// Update existing invoice
export async function updateInvoice(invoiceId, invoiceData) {
  try {
    console.log('📤 Updating invoice:', invoiceId, invoiceData);

    // Attach user context so the backend can enforce creator-only editing.
    // These fields are stripped server-side and never written to the DB.
    const userContext = getUserContext();
    const response = await axios.patch(
      `${API_BASE_URL}invoice/${invoiceId}`,
      { ...invoiceData, ...(userContext || {}) },
      {
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
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

/**
 * @summary Approves or rejects an invoice, optionally attaching the PDF for audit trail.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} invoiceId - The invoice's invoiceId.
 * @param {{ approved: boolean, approverName: string, approverEmail: string, rejectionReason?: string, pdfBase64?: string }} data - Approval payload.
 * @returns {Promise<object>} The updated invoice record with approval status.
 */
export async function approveInvoice(invoiceId, data) {
  try {
    console.log('📤 Approving/rejecting invoice:', invoiceId, { approved: data.approved });
    const response = await axios.post(`${API_BASE_URL}invoices/${invoiceId}/approve`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    console.log('✅ Invoice approval response:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to approve/reject invoice:', error.response?.data || error.message);
    throw error;
  }
}

export async function markInvoicePaid(invoiceId, data) {
  try {
    const response = await axios.post(`${API_BASE_URL}invoices/${invoiceId}/mark-paid`, data, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('❌ Failed to mark invoice as paid:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Issues an invoice by uploading the generated PDF to OneDrive and emailing it to the customer.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} invoiceId - The invoice's invoiceId field.
 * @param {string} pdfBase64 - Base64-encoded PDF content.
 * @returns {Promise<object>} Issue confirmation with delivery details.
 */
export async function issueInvoice(invoiceId, pdfBase64) {
  try {
    console.log('📤 Issuing invoice:', invoiceId);

    const response = await axios.post(
      `${API_BASE_URL}invoices/${invoiceId}/issue`,
      { invoiceId, pdfBase64 },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log('✅ Invoice issued successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to issue invoice:', error.response?.data || error.message);
    throw error;
  }
}


// ============================================================================
// PROFORMA INVOICE API FUNCTIONS
//
// Proformas are raised automatically by the backend when an invoice is
// approved — there is deliberately no create function here.
// ============================================================================

/**
 * @summary Fetches all proforma invoice records.
 * @returns {Promise<object[]>} Array of proforma objects, or empty array on error.
 */
export async function fetchProformaInvoices() {
  try {
    const response = await axios.get(`${API_BASE_URL}proforma-invoices`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data.proformas || [];
  } catch (error) {
    console.error('❌ Failed to fetch proforma invoices:', error.response?.data || error.message);
    return [];
  }
}

/**
 * @summary Fetches a single proforma invoice by its proformaId.
 * @param {string} proformaId
 * @returns {Promise<object|null>} The proforma object, or null if not found.
 */
export async function fetchProformaInvoice(proformaId) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}proforma-invoices/${encodeURIComponent(proformaId)}`,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data.proforma;
  } catch (error) {
    console.error('❌ Failed to fetch proforma invoice:', error.response?.data || error.message);
    return null;
  }
}

/**
 * @summary Updates the editable fields of a proforma (supplier, cover page,
 * special instructions). The line items and totals snapshotted from the
 * invoice are not updatable — the backend ignores them.
 * @param {string} proformaId
 * @param {object} data
 * @returns {Promise<object>} The updated proforma.
 */
export async function updateProformaInvoice(proformaId, data) {
  try {
    const response = await axios.patch(
      `${API_BASE_URL}proforma-invoices/${encodeURIComponent(proformaId)}`,
      data,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data.proforma;
  } catch (error) {
    console.error('❌ Failed to update proforma invoice:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Approves or rejects a proforma. A rejection requires a reason.
 * @param {string} proformaId
 * @param {{approved: boolean, approverName: string, approverEmail?: string, rejectionReason?: string}} data
 * @returns {Promise<object>} The updated proforma.
 */
export async function approveProformaInvoice(proformaId, data) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}proforma-invoices/${encodeURIComponent(proformaId)}/approve`,
      data,
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data.proforma;
  } catch (error) {
    console.error('❌ Failed to approve proforma invoice:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Emails the rendered proforma PDF to the tagged supplier and marks
 * it dispatched. Requires an approved proforma carrying a supplier email.
 * @param {string} proformaId
 * @param {string} pdfBase64 - Base64-encoded PDF content.
 * @returns {Promise<object>} Dispatch confirmation including the recipient.
 */
export async function dispatchProformaInvoice(proformaId, pdfBase64) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}proforma-invoices/${encodeURIComponent(proformaId)}/dispatch`,
      { proformaId, pdfBase64 },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  } catch (error) {
    console.error('❌ Failed to dispatch proforma invoice:', error.response?.data || error.message);
    throw error;
  }
}

// ============================================================================
// EMPLOYEE API FUNCTIONS
// ============================================================================

/**
 * @summary Fetches all employee records.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of employee objects.
 */
export async function getEmployees() {
  try {
    const response = await axios.get(`${API_BASE_URL}/employees`);
    return response.data.employees;
  } catch (error) {
    console.error('Error fetching employees:', error);
    throw error;
  }
}

/**
 * @summary Fetches a single employee record by its ID.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The employee's ID.
 * @returns {Promise<object>} The employee object.
 */
export async function getEmployeeById(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/employees/${id}`);
    return response.data.employee;
  } catch (error) {
    console.error('Error fetching employee:', error);
    throw error;
  }
}

/**
 * @summary Creates a new employee record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} employeeData - Employee fields (name, email, jobTitle, department, etc.).
 * @returns {Promise<object>} The created employee object.
 */
export async function createEmployee(employeeData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/employees`, employeeData);
    return response.data.employee;
  } catch (error) {
    console.error('Error creating employee:', error);
    throw error;
  }
}

/**
 * @summary Updates an existing employee record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The employee's ID.
 * @param {object} employeeData - Fields to update.
 * @returns {Promise<object>} The updated employee object.
 */
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

/**
 * @summary Permanently deletes an employee record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The employee's ID.
 * @returns {Promise<object>} Deletion confirmation response.
 */
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

/**
 * @summary Fetches all business visa requests.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of business visa request objects.
 */
export async function getBusinessVisaRequests() {
  try {
    const response = await axios.get(`${API_BASE_URL}/businessVisaRequests`);
    return response.data.requests;
  } catch (error) {
    console.error('Error fetching business visa requests:', error);
    throw error;
  }
}

/**
 * @summary Fetches a single business visa request by its ID.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The business visa request ID.
 * @returns {Promise<object>} The business visa request object.
 */
export async function getBusinessVisaRequestById(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/businessVisaRequests/${id}`);
    return response.data.request;
  } catch (error) {
    console.error('Error fetching business visa request:', error);
    throw error;
  }
}

/**
 * @summary Creates a new business visa request.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} requestData - Visa request fields (employeeId, destination, purpose, travelDates, etc.).
 * @returns {Promise<object>} The created business visa request object.
 */
export async function createBusinessVisaRequest(requestData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/businessVisaRequests`, requestData);
    return response.data.request;
  } catch (error) {
    console.error('Error creating business visa request:', error);
    throw error;
  }
}

/**
 * @summary Updates an existing business visa request.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The business visa request ID.
 * @param {object} requestData - Fields to update.
 * @returns {Promise<object>} The updated business visa request object.
 */
export async function updateBusinessVisaRequest(id, requestData) {
  try {
    const response = await axios.patch(`${API_BASE_URL}/businessVisaRequests/${id}`, requestData);
    return response.data.request;
  } catch (error) {
    console.error('Error updating business visa request:', error);
    throw error;
  }
}

/**
 * @summary Permanently deletes a business visa request.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The business visa request ID.
 * @returns {Promise<object>} Deletion confirmation response.
 */
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

/**
 * @summary Fetches all leave requests.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of leave request objects.
 */
export async function getLeaveRequests() {
  try {
    const response = await axios.get(`${API_BASE_URL}/leaveRequests`);
    return response.data.requests;
  } catch (error) {
    console.error('Error fetching leave requests:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Fetches a single leave request by its ID.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The leave request ID.
 * @returns {Promise<object>} The leave request object.
 */
export async function getLeaveRequestById(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/leaveRequests/${id}`);
    return response.data.request;
  } catch (error) {
    console.error('Error fetching leave request:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Creates a new leave request for an employee.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} requestData - Leave request fields (employeeId, leaveType, startDate, endDate, reason, etc.).
 * @returns {Promise<object>} The created leave request object.
 */
export async function createLeaveRequest(requestData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/leaveRequests`, requestData);
    return response.data.request;
  } catch (error) {
    console.error('Error creating leave request:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Updates an existing leave request.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The leave request ID.
 * @param {object} requestData - Fields to update.
 * @returns {Promise<object>} The updated leave request object.
 */
export async function updateLeaveRequest(id, requestData) {
  try {
    const response = await axios.patch(`${API_BASE_URL}/leaveRequests/${id}`, requestData);
    return response.data.request;
  } catch (error) {
    console.error('Error updating leave request:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Permanently deletes a leave request.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The leave request ID.
 * @returns {Promise<object>} Deletion confirmation response.
 */
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

/**
 * @summary Fetches all available roles for RBAC assignment.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of role objects.
 */
export async function fetchRoles() {
  const response = await axios.get(`${API_BASE_URL}roles`);
  return response.data?.roles || response.data || [];
}

export async function fetchUsersWithRoles() {
  const response = await axios.get(`${API_BASE_URL}users-with-roles`);
  return response.data?.users || [];
}

/**
 * @summary Assigns a role to a user by their ID.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ id: string, roleId: number }} params - The user's ID and the target role ID.
 * @returns {Promise<object>} The updated user record.
 */
export async function setUserRoleApi({ id, roleId }) {
  if (!id || !roleId) throw new Error('id and roleId are required');
  const response = await axios.patch(
    `${API_BASE_URL}users?id=eq.${id}`,
    { roleId },
    { headers: { Prefer: 'return=representation' } }
  );
  return Array.isArray(response.data) ? response.data[0] : response.data;
}

/**
 * @summary Links a user to a manager for delegation and approval chains.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ managerId: string, userId: string }} params - The manager and user IDs.
 * @returns {Promise<object>} The created manager-user association record.
 */
export async function assignManagerApi({ managerId, userId }) {
  if (!managerId || !userId) throw new Error('managerId and userId are required');
  const response = await axios.post(
    '/api/rbac/manager-users',
    { managerId, userId },
    { headers: { Prefer: 'return=representation' } }
  );
  return Array.isArray(response.data) ? response.data[0] : response.data;
}

/**
 * @summary Fetches all users reporting to a given manager.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} managerId - The manager's user ID.
 * @returns {Promise<object[]>} Array of user objects managed by the given manager.
 */
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

/**
 * @summary Fetches the full list of navigation permission definitions.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of nav permission objects.
 */
export async function fetchNavPermissions() {
  const response = await axios.get(`${API_BASE_URL}nav-permissions`);
  return response.data?.permissions || [];
}

export async function refreshNavPermissionsCache() {
  const response = await axios.post(`${API_BASE_URL}nav-permissions/refresh-cache`);
  return response.data;
}

/**
 * @summary Fetches the navigation permissions granted to a specific user.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} userId - The user's ID.
 * @returns {Promise<object[]>} Array of permission objects enabled for the user.
 */
export async function fetchUserNavPermissions(userId) {
  if (!userId) return [];
  const response = await axios.get(
    `${API_BASE_URL}user-nav-permissions/${encodeURIComponent(userId)}`
  );
  return response.data?.permissions || [];
}

/**
 * @summary Returns only the enabled URL paths for a specific user (for route guards).
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} userId - The user's ID.
 * @returns {Promise<string[]>} Array of URL path strings the user is permitted to access.
 */
export async function fetchUserEnabledPaths(userId) {
  if (!userId) return { paths: [], hasExplicitPermissions: false };
  const response = await axios.get(
    `${API_BASE_URL}user-nav-permissions/${encodeURIComponent(userId)}/paths`
  );
  return {
    paths: response.data?.paths || [],
    hasExplicitPermissions: response.data?.hasExplicitPermissions ?? false,
  };
}

/**
 * @summary Sets (replaces) all navigation permissions for a specific user.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ userId: string, permissions: string[], grantedBy: string }} params - The user ID, new permission list, and the admin granting them.
 * @returns {Promise<object>} Updated permission record.
 */
export async function setUserNavPermissions({ userId, permissions, grantedBy }) {
  if (!userId) throw new Error('userId is required');
  const response = await axios.post(`${API_BASE_URL}user-nav-permissions/set`, {
    userId,
    permissions: permissions || [],
    grantedBy,
  });
  return response.data;
}

/**
 * @summary Grants the default set of navigation permissions for a user based on their role.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ userId: string, role: string, grantedBy: string }} params - The user ID, role name, and admin granting defaults.
 * @returns {Promise<object>} The granted permissions record.
 */
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
// Enterprise App Access Management
// =============================================

export async function fetchEnterpriseAppUsers() {
  const response = await axios.get(`${API_BASE_URL}enterprise-app-users`);
  return response.data?.assignments || [];
}

export async function addEnterpriseAppUser(principalId) {
  if (!principalId) throw new Error('principalId is required');
  const response = await axios.post(`${API_BASE_URL}enterprise-app-users`, { principalId });
  return response.data?.assignment;
}

export async function removeEnterpriseAppUser(assignmentId) {
  if (!assignmentId) throw new Error('assignmentId is required');
  await axios.delete(`${API_BASE_URL}enterprise-app-users/${assignmentId}`);
}

// =============================================
// Job Management API Functions
// =============================================

/**
 * @summary Fetches job postings with optional filters for status, type, department, and remote/featured flags.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ page?: number, limit?: number, status?: string, jobType?: string, department?: string, isRemote?: boolean, isFeatured?: boolean }} [params] - Optional filter and pagination parameters.
 * @returns {Promise<object>} Paginated list of job postings.
 */
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

/**
 * @summary Fetches a single job posting by its ID.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The job posting ID.
 * @returns {Promise<object|null>} The job posting object, or null if id is falsy.
 */
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

/**
 * @summary Creates a new job posting.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} jobData - Job posting fields (title, department, jobType, description, requirements, etc.).
 * @returns {Promise<object>} The created job posting object.
 */
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

/**
 * @summary Updates an existing job posting.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The job posting ID.
 * @param {object} jobData - Fields to update.
 * @returns {Promise<object>} The updated job posting object.
 */
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

/**
 * @summary Permanently deletes a job posting.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The job posting ID.
 * @returns {Promise<object>} Deletion confirmation response.
 */
export async function deleteJob(id) {
  try {
    const response = await axios.delete(`${API_BASE_URL}jobs/${id}`);
    return response.data;
  } catch (error) {
    console.error('Failed to delete job:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Syncs a job posting to Webflow CMS, optionally publishing it immediately.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} jobId - The job posting ID to sync.
 * @param {boolean} [publish=true] - Whether to publish the item in Webflow immediately after sync.
 * @returns {Promise<object>} Sync result including the Webflow item ID.
 */
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

/**
 * @summary Tests the Webflow API connection to verify credentials and site access.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object>} Connection test result with status details.
 */
export async function testWebflowConnection() {
  try {
    const response = await axios.get(`${API_BASE_URL}webflow/test`);
    return response.data;
  } catch (error) {
    console.error('Failed to test Webflow connection:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Publishes pending Webflow CMS changes to the live site.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object>} Publish confirmation response.
 */
export async function publishToWebflow() {
  try {
    const response = await axios.post(`${API_BASE_URL}webflow/publish`);
    return response.data;
  } catch (error) {
    console.error('Failed to publish to Webflow:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Fetches a specific integration record by name and type.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} integrationName - The integration name (e.g. "zoho", "webflow").
 * @param {string} integrationType - The integration type/subtype.
 * @returns {Promise<object>} The integration configuration record.
 */
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

/**
 * @summary Updates an existing integration's configuration.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} integrationName - The integration name.
 * @param {string} integrationType - The integration type/subtype.
 * @param {object} data - Configuration fields to update.
 * @returns {Promise<object>} The updated integration record.
 */
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

/**
 * @summary Fetches all integration records, optionally filtered by params.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} [params] - Optional query parameters to filter integrations.
 * @returns {Promise<object[]>} Array of integration objects, or empty array on error.
 */
export async function getIntegrations(params = {}) {
  try {
    const response = await axios.get(`${API_BASE_URL}integrations`, { params });
    return response.data?.integrations || response.data || [];
  } catch (error) {
    console.error('Failed to fetch integrations:', error.response?.data || error.message);
    return [];
  }
}

/**
 * @summary Creates a new integration configuration record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} data - Integration fields (integrationName, integrationType, credentials, etc.).
 * @returns {Promise<object>} The created integration record.
 */
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

/**
 * @summary Permanently deletes an integration record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} integrationName - The integration name.
 * @param {string} integrationType - The integration type/subtype.
 * @returns {Promise<{ success: boolean }>} Deletion confirmation.
 */
export async function deleteIntegration(integrationName, integrationType) {
  try {
    await axios.delete(`${API_BASE_URL}integrations/${integrationName}/${integrationType}`);
    return { success: true };
  } catch (error) {
    console.error('Failed to delete integration:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * @summary Tests the live connection for a configured integration.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} integrationName - The integration name.
 * @param {string} integrationType - The integration type/subtype.
 * @returns {Promise<object>} Test result with connectivity status and details.
 */
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

/**
 * @summary Fetches all offer records.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of offer objects.
 */
export async function getOffers() {
  try {
    const response = await axios.get(`${API_BASE_URL}/offers`);
    return response.data.offers;
  } catch (error) {
    console.error('Error fetching offers:', error);
    throw error;
  }
}

/**
 * @summary Fetches a single offer record by its ID.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The offer ID.
 * @returns {Promise<object>} The offer object.
 */
export async function getOffer(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/offers/${id}`);
    return response.data.offer;
  } catch (error) {
    console.error('Error fetching offer:', error);
    throw error;
  }
}

/**
 * @summary Creates a new offer record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} offerData - Offer fields (candidateName, position, salary, startDate, etc.).
 * @returns {Promise<object>} The created offer object.
 */
export async function createOffer(offerData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/offers`, offerData);
    return response.data.offer;
  } catch (error) {
    console.error('Error creating offer:', error);
    throw error;
  }
}

/**
 * @summary Updates an existing offer record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The offer ID.
 * @param {object} offerData - Fields to update.
 * @returns {Promise<object>} The updated offer object.
 */
export async function updateOffer(id, offerData) {
  try {
    const response = await axios.patch(`${API_BASE_URL}/offers/${id}`, offerData);
    return response.data.offer;
  } catch (error) {
    console.error('Error updating offer:', error);
    throw error;
  }
}

/**
 * @summary Approves an offer, recording the approver and optional comments.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The offer ID.
 * @param {string} approvedBy - Email of the approver.
 * @param {string} [approvalComments] - Optional approval comments.
 * @returns {Promise<object>} The approved offer object.
 */
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

/**
 * @summary Rejects an offer with a mandatory rejection reason.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The offer ID.
 * @param {string} rejectedBy - Email of the person rejecting the offer.
 * @param {string} rejectionReason - Required explanation for rejection.
 * @returns {Promise<object>} The rejected offer object.
 */
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

/**
 * @summary Adds a review comment to an offer without changing its approval status.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The offer ID.
 * @param {string} commentedBy - Email of the commenter.
 * @param {string} comments - The comment text.
 * @returns {Promise<object>} The updated offer object with the new comment.
 */
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

/**
 * @summary Permanently deletes an offer record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The offer ID.
 * @returns {Promise<object>} Deletion confirmation response.
 */
export async function deleteOffer(id) {
  try {
    const response = await axios.delete(`${API_BASE_URL}/offers/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting offer:', error);
    throw error;
  }
}

/**
 * @summary Sends an approved offer to IOTA signatories for digital signing.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The offer ID.
 * @param {string[]} iotaSignatories - Array of IOTA signatory email addresses.
 * @param {string} requestedBy - Email of the user triggering the send.
 * @returns {Promise<object>} The updated offer object with signing status.
 */
export async function sendOfferForSigning(id, iotaSignatories, requestedBy) {
  try {
    const response = await axios.post(`${API_BASE_URL}/offers/${id}/send-for-signing`, {
      id,
      iotaSignatories,
      requestedBy,
    });
    return response.data.offer;
  } catch (error) {
    console.error('Error sending offer for signing:', error);
    throw error;
  }
}

/**
 * @summary Submits an IOTA staff member's digital signature on an offer.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The offer ID.
 * @param {string} signatureData - Base64-encoded signature image data.
 * @param {string} signerEmail - Email address of the IOTA signatory.
 * @param {string} [ipAddress] - IP address of the signer for audit trail.
 * @returns {Promise<object>} The updated offer object.
 */
export async function iotaSignOffer(id, signatureData, signerEmail, ipAddress) {
  try {
    const response = await axios.post(`${API_BASE_URL}/offers/${id}/iotaSign`, {
      id,
      signatureData,
      signerEmail,
      ipAddress: ipAddress || '',
    });
    return response.data.offer;
  } catch (error) {
    console.error('Error submitting IOTA signature on offer:', error);
    throw error;
  }
}

/**
 * @summary Fetches an offer using a one-time signing token (used by the candidate-facing signing page).
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} token - The JWT signing token sent in the offer email.
 * @returns {Promise<object>} Offer data including the document for signing.
 */
export async function getOfferByToken(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/offers/sign/${token}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching offer by token:', error);
    throw error;
  }
}

/**
 * @summary Submits a candidate's digital signature on their offer letter.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} token - The JWT signing token from the candidate's email link.
 * @param {string} signatureData - Base64-encoded signature image data.
 * @param {string} [ipAddress] - IP address of the candidate for audit trail.
 * @returns {Promise<object>} The updated offer object with the candidate's signature.
 */
export async function employeeSignOffer(token, signatureData, ipAddress) {
  try {
    const response = await axios.post(`${API_BASE_URL}/offers/employee-sign`, {
      token,
      signatureData,
      ipAddress: ipAddress || '',
    });
    return response.data.offer;
  } catch (error) {
    console.error('Error submitting employee signature on offer:', error);
    throw error;
  }
}

/**
 * @summary Saves the signature zone positions on the offer PDF for each signatory.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The offer ID.
 * @param {object[]} signatureZones - Array of signature zone definitions (page, x, y, width, height, signerEmail).
 * @returns {Promise<object>} The updated offer object with saved signature zones.
 */
export async function setOfferSignatureZones(id, signatureZones) {
  try {
    const response = await axios.post(`${API_BASE_URL}/offers/${id}/signature-zones`, {
      id,
      signatureZones,
    });
    return response.data.offer;
  } catch (error) {
    console.error('Error saving offer signature zones:', error);
    throw error;
  }
}

/**
 * @summary Sends a reminder email to the candidate prompting them to sign their offer letter.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The offer ID.
 * @param {string} requestedBy - Email of the staff member sending the reminder.
 * @returns {Promise<object>} The updated offer object.
 */
export async function remindEmployeeToSign(id, requestedBy) {
  try {
    const response = await axios.post(`${API_BASE_URL}/offers/${id}/remind-employee`, {
      id,
      requestedBy,
    });
    return response.data.offer;
  } catch (error) {
    console.error('Error sending employee reminder:', error);
    throw error;
  }
}

/**
 * @summary Finalizes an offer by embedding all signatures into the PDF and storing it.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The offer ID.
 * @param {string} pdfBase64 - The unsigned PDF as a Base64-encoded string (signatures will be embedded server-side).
 * @returns {Promise<object>} The finalized offer object with the signed document URL.
 */
export async function finalizeOffer(id, pdfBase64) {
  try {
    const response = await axios.post(`${API_BASE_URL}/offers/${id}/finalize`, {
      id,
      pdfBase64,
    });
    return response.data.offer;
  } catch (error) {
    console.error('Error finalizing offer:', error);
    throw error;
  }
}

// ============================================================================
// NDA MANAGEMENT API FUNCTIONS
// ============================================================================

/**
 * @summary Fetches all NDA records.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of NDA objects.
 */
export async function getNdas() {
  try {
    const response = await axios.get(`${API_BASE_URL}ndas`);
    return response.data.ndas;
  } catch (error) {
    console.error('Error fetching NDAs:', error);
    throw error;
  }
}

/**
 * @summary Fetches a single NDA record by its ID.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The NDA ID.
 * @returns {Promise<object>} The NDA object.
 */
export async function getNda(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}ndas/${id}`);
    return response.data.nda;
  } catch (error) {
    console.error('Error fetching NDA:', error);
    throw error;
  }
}

/**
 * @summary Fetches an NDA using a one-time signing token (for the partner-facing signing page).
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} token - The JWT signing token sent in the NDA email.
 * @returns {Promise<object>} NDA data including the document for signing.
 */
export async function getNdaByToken(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}ndas/sign/${token}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching NDA by token:', error);
    throw error;
  }
}

/**
 * @summary Creates a new NDA record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {object} ndaData - NDA fields (partnerName, partnerEmail, effectiveDate, template, etc.).
 * @returns {Promise<object>} The created NDA object.
 */
export async function createNda(ndaData) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas`, ndaData);
    return response.data.nda;
  } catch (error) {
    console.error('Error creating NDA:', error);
    throw error;
  }
}

/**
 * @summary Updates an existing NDA record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The NDA ID.
 * @param {object} ndaData - Fields to update.
 * @returns {Promise<object>} The updated NDA object.
 */
export async function updateNda(id, ndaData) {
  try {
    const response = await axios.patch(`${API_BASE_URL}ndas/${id}`, ndaData);
    return response.data.nda;
  } catch (error) {
    console.error('Error updating NDA:', error);
    throw error;
  }
}

/**
 * @summary Submits an NDA to the IOTA signing queue for internal signatory review.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The NDA ID.
 * @param {string} submittedBy - Email of the user submitting the NDA for signing.
 * @returns {Promise<object>} The updated NDA object with "pending_iota_signature" status.
 */
export async function submitNdaForIotaSigning(id, submittedBy) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/submit`, { submittedBy });
    return response.data.nda;
  } catch (error) {
    console.error('Error submitting NDA for signing:', error);
    throw error;
  }
}

/**
 * @summary Submits an IOTA staff member's digital signature on an NDA.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The NDA ID.
 * @param {string} signatureData - Base64-encoded signature image data.
 * @param {string} signerEmail - Email of the IOTA signatory.
 * @returns {Promise<object>} The updated NDA object with the IOTA signature recorded.
 */
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

/**
 * @summary Submits a partner signatory's digital signature on an NDA via their secure signing link.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} token - The JWT signing token from the partner's email link.
 * @param {string} signatureData - Base64-encoded signature image data.
 * @param {string} [ipAddress] - IP address of the partner for audit trail.
 * @returns {Promise<object>} The updated NDA object with the partner's signature recorded.
 */
export async function partnerSignNda(token, signatureData, ipAddress, sessionToken, userAgent) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/sign/${token}`, {
      signatureData,
      ipAddress: ipAddress || '',
      sessionToken: sessionToken || '',
      userAgent: userAgent || '',
    });
    return response.data.nda;
  } catch (error) {
    console.error('Error submitting partner signature:', error);
    throw error;
  }
}

/**
 * @summary Sends a 6-digit OTP to the signatory's registered email address.
 * @param {string} token - The JWT signing token from the partner's email link.
 * @returns {Promise<{maskedEmail: string}>} Masked email address the code was sent to.
 */
export async function requestNdaOtp(token) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/sign/${token}/request-otp`);
    return response.data;
  } catch (error) {
    console.error('Error requesting NDA OTP:', error);
    throw error;
  }
}

/**
 * @summary Verifies the OTP entered by the signer and returns a session token.
 * @param {string} token - The JWT signing token from the partner's email link.
 * @param {string} code - The 6-digit OTP entered by the signer.
 * @returns {Promise<{sessionToken: string}>} Session token to present when submitting signature.
 */
export async function verifyNdaOtp(token, code) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/sign/${token}/verify-otp`, { code });
    return response.data;
  } catch (error) {
    console.error('Error verifying NDA OTP:', error);
    throw error;
  }
}

/**
 * @summary Finalizes an NDA by embedding all signatures into the PDF and storing it permanently.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The NDA ID.
 * @param {string} pdfBase64 - The unsigned PDF as a Base64-encoded string.
 * @returns {Promise<object>} The finalized NDA object with the signed document URL.
 */
export async function finalizeNda(id, pdfBase64) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/finalize`, { pdfBase64 });
    return response.data.nda;
  } catch (error) {
    console.error('Error finalizing NDA:', error);
    throw error;
  }
}

/**
 * @summary Cancels an NDA, recording the reason and who cancelled it.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The NDA ID.
 * @param {string} cancelledBy - Email of the user cancelling the NDA.
 * @param {string} reason - Reason for cancellation.
 * @returns {Promise<object>} The cancelled NDA object.
 */
export async function cancelNda(id, cancelledBy, reason) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/cancel`, { cancelledBy, reason });
    return response.data.nda;
  } catch (error) {
    console.error('Error cancelling NDA:', error);
    throw error;
  }
}

/**
 * @summary Uploads an externally signed NDA document (e.g. a pre-signed PDF scan) to attach to the record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The NDA ID.
 * @param {string} fileName - The document file name (e.g. "signed-nda.pdf").
 * @param {string} fileBase64 - The file content as a Base64-encoded string.
 * @returns {Promise<object>} The updated NDA object with the document URL.
 */
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

/**
 * @summary Saves stamp placement positions on the NDA PDF for official stamp overlays.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The NDA ID.
 * @param {object[]} stampPlacements - Array of stamp placement definitions (page, x, y, width, height).
 * @returns {Promise<object>} The updated NDA object with saved stamp placements.
 */
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

/**
 * @summary Saves the IOTA-side signature zone positions on the NDA PDF.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The NDA ID.
 * @param {object[]} signatureZones - Array of signature zone definitions for IOTA signatories.
 * @returns {Promise<object>} The updated NDA object with saved IOTA signature zones.
 */
export async function setNdaSignatureZones(id, signatureZones) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/signature-zones`, {
      id,
      signatureZones,
    });
    return response.data.nda;
  } catch (error) {
    console.error('Error saving NDA signature zones:', error);
    throw error;
  }
}

/**
 * @summary Sends a reminder email to all outstanding partner signatories for an NDA.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The NDA ID.
 * @param {string} requestedBy - Email of the staff member sending the reminder.
 * @returns {Promise<object>} The updated NDA object.
 */
export async function remindPartnerSignatories(id, requestedBy) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/remindPartner`, {
      requestedBy,
    });
    return response.data.nda;
  } catch (error) {
    console.error('Error sending partner reminder:', error);
    throw error;
  }
}

/**
 * @summary Saves the partner-side signature zone positions on the NDA PDF.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string|number} id - The NDA ID.
 * @param {object[]} partnerSignatureZones - Array of signature zone definitions for partner signatories.
 * @returns {Promise<object>} The updated NDA object with saved partner signature zones.
 */
export async function setNdaPartnerSignatureZones(id, partnerSignatureZones) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/partner-signature-zones`, {
      id,
      partnerSignatureZones,
    });
    return response.data.nda;
  } catch (error) {
    console.error('Error saving partner signature zones:', error);
    throw error;
  }
}

/**
 * @summary Marks a manual (wet-signature) NDA as Fully Executed, optionally uploading the
 *          physically-signed document to OneDrive.
 * @param {string|number} id - The NDA ID.
 * @param {string} markedBy - Email of the HR user performing the action.
 * @param {string} [fileName] - Original filename of the fully-executed document.
 * @param {string} [fileBase64] - base64-encoded file bytes to upload to OneDrive.
 * @returns {Promise<object>} The updated NDA object.
 */
export async function markNdaFullyExecuted(id, markedBy, fileName, fileBase64) {
  try {
    const payload = { id, markedBy };
    if (fileName) payload.fileName = fileName;
    if (fileBase64) payload.fileBase64 = fileBase64;
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/mark-fully-executed`, payload);
    return response.data.nda;
  } catch (error) {
    console.error('Error marking NDA as fully executed:', error);
    throw error;
  }
}

/**
 * Creates an OneDrive resumable upload session for a partner NDA document.
 * The browser then PUTs the raw file bytes directly to the returned uploadUrl,
 * completely bypassing Encore's JSON body size limit.
 */
export async function createNdaUploadSession(id, fileName, contentType) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/create-upload-session`, {
      fileName,
      contentType: contentType || 'application/octet-stream',
    });
    return response.data; // { uploadUrl, safeFileName }
  } catch (error) {
    console.error('Error creating NDA upload session:', error);
    throw error;
  }
}

/**
 * Links an already-uploaded OneDrive file to the NDA record.
 * Called after the browser completes the direct OneDrive upload.
 */
export async function linkNdaDocument(id, fileName, onedriveFileId, onedriveWebUrl) {
  try {
    const response = await axios.post(`${API_BASE_URL}ndas/${id}/link-document`, {
      fileName,
      onedriveFileId,
      onedriveWebUrl,
    });
    return response.data.nda;
  } catch (error) {
    console.error('Error linking NDA document:', error);
    throw error;
  }
}

/**
 * Fetches NDA document content (base64) for inline viewing.
 * Returns stored base64 for legacy uploads; fetches from OneDrive for new uploads.
 */
export async function fetchNdaDocumentContent(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}ndas/${id}/document`);
    return response.data; // { fileName, contentType, base64 }
  } catch (error) {
    console.error('Error fetching NDA document content:', error);
    throw error;
  }
}

// ============================================================================
// WEBHOOK EVENTS API FUNCTIONS
// ============================================================================

/**
 * @summary Fetches webhook event records with optional filters for source, type, status, and date range.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {{ source?: string, eventType?: string, status?: string, fromDate?: string, toDate?: string, limit?: number, offset?: number }} [params] - Filter and pagination options.
 * @returns {Promise<{ events: object[], total: number }>} Webhook events and total count; returns empty on error.
 */
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

/**
 * @summary Returns the current enable/disable state of the Vercel log drain integration.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<{ enabled: boolean }>} Status object; returns `{ enabled: false }` on error.
 */
export async function getLogDrainStatus() {
  try {
    const response = await axios.get(`${API_BASE_URL}webhook/log-drain/status`);
    return response.data;
  } catch (error) {
    console.error('Failed to get log drain status:', error.response?.data || error.message);
    return { enabled: false };
  }
}

/**
 * @summary Enables or disables the Vercel log drain integration.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {boolean} enabled - `true` to enable the log drain, `false` to disable.
 * @returns {Promise<{ enabled: boolean }>} Updated status; returns `{ enabled: false }` on error.
 */
export async function toggleLogDrain(enabled) {
  try {
    const response = await axios.post(`${API_BASE_URL}webhook/log-drain/toggle`, { enabled });
    return response.data;
  } catch (error) {
    console.error('Failed to toggle log drain:', error.response?.data || error.message);
    return { enabled: false };
  }
}

const QURAN_API_BASE = 'https://quranapi.pages.dev/api';

/**
 * @summary Fetches a specific Quranic verse (ayah) from the Quran API.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {number} surahNo - The Surah (chapter) number (1–114).
 * @param {number} ayahNo - The Ayah (verse) number within the Surah.
 * @returns {Promise<object>} Verse data including Arabic text, transliteration, and translation.
 */
async function fetchQuranVerse(surahNo, ayahNo) {
  try {
    const response = await fetch(`${QURAN_API_BASE}/${surahNo}/${ayahNo}.json`);
    if (!response.ok) throw new Error(`Quran verse fetch failed: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error('Failed to fetch Quran verse:', error);
    throw error;
  }
}

/**
 * @summary Fetches the Tafsir (exegesis / scholarly commentary) for a specific Quranic verse.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {number} surahNo - The Surah (chapter) number (1–114).
 * @param {number} ayahNo - The Ayah (verse) number within the Surah.
 * @returns {Promise<object>} Tafsir data including the scholarly interpretation.
 */
async function fetchQuranTafsir(surahNo, ayahNo) {
  try {
    const response = await fetch(`${QURAN_API_BASE}/tafsir/${surahNo}_${ayahNo}.json`);
    if (!response.ok) throw new Error(`Quran tafsir fetch failed: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error('Failed to fetch Quran tafsir:', error);
    throw error;
  }
}

// ----------------------------------------------------------------------
// Policy Management
// ----------------------------------------------------------------------

/**
 * @summary Fetches all company policy records.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of policy objects.
 */
export async function getPolicies() {
  try {
    const response = await axios.get(`${API_BASE_URL}/policies`);
    return response.data.policies;
  } catch (error) {
    console.error('Error fetching policies:', error);
    throw error;
  }
}

/**
 * @summary Fetches a single policy record by ID.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} id - The policy ID.
 * @returns {Promise<object>} The policy object.
 */
export async function getPolicyById(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/policies/${id}`);
    return response.data.policy;
  } catch (error) {
    console.error('Error fetching policy:', error);
    throw error;
  }
}

/**
 * @summary Fetches all employee policy acknowledgement records.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object[]>} Array of acknowledgement objects.
 */
export async function getPolicyAcknowledgements() {
  try {
    const response = await axios.get(`${API_BASE_URL}/policies/acknowledgements`);
    return response.data.acknowledgements;
  } catch (error) {
    console.error('Error fetching policy acknowledgements:', error);
    throw error;
  }
}

/**
 * @summary Fetches policy acknowledgements filtered by a specific employee.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} employeeId - The employee's ID.
 * @returns {Promise<object[]>} Array of acknowledgement objects for the employee.
 */
export async function getPolicyAcknowledgementsByEmployee(employeeId) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/policies/acknowledgements/employee/${employeeId}`
    );
    return response.data.acknowledgements;
  } catch (error) {
    console.error('Error fetching employee policy acknowledgements:', error);
    throw error;
  }
}

/**
 * @summary Sends policy signing links to an employee via email.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} employeeId - The employee's ID.
 * @param {object} employeeData - Employee details for the email ({ name|firstName, lastName, email }).
 * @returns {Promise<object>} Response confirmation object.
 */
export async function sendPolicyLinksToEmployee(employeeId, employeeData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/policies/send-to-employee`, {
      employeeId,
      employeeName:
        employeeData.name || `${employeeData.firstName} ${employeeData.lastName}`.trim(),
      employeeEmail: employeeData.email,
    });
    return response.data;
  } catch (error) {
    console.error('Error sending policy links to employee:', error);
    throw error;
  }
}

/**
 * @summary Sends specific policy emails to one employee.
 * @param {number} employeeId - The employee's ID.
 * @param {object} employeeData - Employee name/email fields.
 * @param {number[]} policyIds - Specific policy IDs to send.
 * @returns {Promise<object>} Result with sent/failed counts.
 */
export async function sendPoliciesToSelectedEmployees(employeeId, employeeData, policyIds) {
  try {
    const response = await axios.post(`${API_BASE_URL}/policies/send-to-employee`, {
      employeeId,
      employeeName:
        employeeData.name || `${employeeData.firstName} ${employeeData.lastName}`.trim(),
      employeeEmail: employeeData.email,
      policyIds,
    });
    return response.data;
  } catch (error) {
    console.error('Error sending selected policies to employee:', error);
    throw error;
  }
}

/**
 * @summary Fetches a policy record via a one-time signing token (employee-facing).
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} token - The one-time signing token.
 * @returns {Promise<object>} Policy data associated with the token.
 */
export async function getPolicyBySigningToken(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/policies/sign/${token}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching policy by signing token:', error);
    throw error;
  }
}

/**
 * @summary Submits an employee's policy acknowledgement and signature.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} token - The one-time signing token.
 * @param {object} signatureData - Signature payload (e.g. drawn signature, timestamp).
 * @returns {Promise<object>} Confirmation of the signed acknowledgement.
 */
export async function signPolicy(token, signatureData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/policies/sign`, { token, ...signatureData });
    return response.data;
  } catch (error) {
    console.error('Error signing policy:', error);
    throw error;
  }
}

/**
 * @summary Seeds default policy records into the system (admin/dev utility).
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @returns {Promise<object>} Result of the seed operation.
 */
export async function seedPolicies() {
  try {
    const response = await axios.post(`${API_BASE_URL}/policies/seed`);
    return response.data;
  } catch (error) {
    console.error('Error seeding policies:', error);
    throw error;
  }
}

/**
 * @summary Updates an existing policy record.
 * @author Jaffar Meeran <jaffar@iotatechnologies.ai>
 * @version 1.0.0
 * @since 2026-04-21
 * @modified 2026-04-21
 * @param {string} id - The policy ID to update.
 * @param {object} data - Updated policy fields.
 * @returns {Promise<object>} The updated policy object.
 */
export async function updatePolicy(id, data) {
  try {
    const response = await axios.put(`${API_BASE_URL}/policies/${id}`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating policy:', error);
    throw error;
  }
}

/**
 * @summary Fetches all policy role assignments.
 * @returns {Promise<Array>} List of role → policy assignment records.
 */
export async function getPolicyRoleAssignments() {
  try {
    const response = await axios.get(`${API_BASE_URL}/policies/role-assignments`);
    return response.data?.assignments || [];
  } catch (error) {
    console.error('Error fetching policy role assignments:', error);
    throw error;
  }
}

/**
 * @summary Assigns a set of policies to a role (replaces existing assignments for that role).
 * @param {string} role - The role identifier (e.g. 'employee', 'manager').
 * @param {number[]} policyIds - Array of policy IDs to assign.
 * @param {string} [assignedBy] - Name or email of the HR user making the assignment.
 * @returns {Promise<object>} Result with assigned/removed counts.
 */
export async function assignPoliciesToRole(role, policyIds, assignedBy) {
  try {
    const response = await axios.post(`${API_BASE_URL}/policies/role-assignments`, {
      role,
      policyIds,
      assignedBy: assignedBy || null,
    });
    return response.data;
  } catch (error) {
    console.error('Error assigning policies to role:', error);
    throw error;
  }
}

/**
 * @summary Sends role-assigned policy emails to all employees with the given role.
 * @param {string} role - The role identifier.
 * @param {string} [assignedBy] - Name or email of the HR user triggering the send.
 * @returns {Promise<object>} Result with employeesNotified, totalSent, totalFailed.
 */
export async function sendPoliciesByRole(role, assignedBy) {
  try {
    const response = await axios.post(`${API_BASE_URL}/policies/send-by-role`, {
      role,
      assignedBy: assignedBy || null,
    });
    return response.data;
  } catch (error) {
    console.error('Error sending policies by role:', error);
    throw error;
  }
}

// ============================================================
// Sales Pipeline Deals
// ============================================================

const SALES_API_URL = process.env.NEXT_PUBLIC_SERVER_URL;

export async function listPipelineDeals() {
  const response = await axios.get(`${SALES_API_URL}/sales/pipeline`);
  return response.data;
}

export async function getPipelineDeal(id) {
  const response = await axios.get(`${SALES_API_URL}/sales/pipeline/${id}`);
  return response.data;
}

export async function createPipelineDeal(data) {
  const response = await axios.post(`${SALES_API_URL}/sales/pipeline`, data);
  return response.data;
}

export async function updatePipelineDeal(id, data) {
  const response = await axios.patch(`${SALES_API_URL}/sales/pipeline/${id}`, { id, ...data });
  return response.data;
}

export async function deletePipelineDeal(id) {
  const response = await axios.delete(`${SALES_API_URL}/sales/pipeline/${id}`);
  return response.data;
}

export async function updatePipelineDealStage(id, stage) {
  const response = await axios.patch(`${SALES_API_URL}/sales/pipeline/${id}`, { id, stage });
  return response.data;
}

export async function addPipelineActivity(id, type, content, performedBy) {
  const response = await axios.post(`${SALES_API_URL}/sales/pipeline/${id}/activity`, {
    id,
    type,
    content,
    performedBy,
  });
  return response.data;
}

// ============================================================
// Sales Activity Ledger
// ============================================================

export async function listLedgerEntries() {
  const response = await axios.get(`${SALES_API_URL}/sales/ledger`);
  return response.data;
}

export async function getLedgerEntry(id) {
  const response = await axios.get(`${SALES_API_URL}/sales/ledger/${id}`);
  return response.data;
}

export async function createLedgerEntry(data) {
  const response = await axios.post(`${SALES_API_URL}/sales/ledger`, data);
  return response.data;
}

export async function updateLedgerEntry(id, data) {
  const response = await axios.patch(`${SALES_API_URL}/sales/ledger/${id}`, { id, ...data });
  return response.data;
}

export async function deleteLedgerEntry(id) {
  const response = await axios.delete(`${SALES_API_URL}/sales/ledger/${id}`);
  return response.data;
}

export async function addLedgerActivity(id, activityData) {
  const response = await axios.post(`${SALES_API_URL}/sales/ledger/${id}/activity`, {
    id,
    ...activityData,
  });
  return response.data;
}

// ============================================================
// Profile / PRMS
// ============================================================

const PROFILE_API_URL = process.env.NEXT_PUBLIC_SERVER_URL;

export async function listJobDescriptions() {
  const response = await axios.get(`${PROFILE_API_URL}/profile/jd`);
  return response.data;
}

export async function getJobDescription(id) {
  const response = await axios.get(`${PROFILE_API_URL}/profile/jd/${id}`);
  return response.data;
}

export async function createJobDescription(data) {
  const response = await axios.post(`${PROFILE_API_URL}/profile/jd`, data);
  return response.data;
}

export async function updateJobDescription(id, data) {
  const response = await axios.patch(`${PROFILE_API_URL}/profile/jd/${id}`, { id, ...data });
  return response.data;
}

export async function deleteJobDescription(id) {
  const response = await axios.delete(`${PROFILE_API_URL}/profile/jd/${id}`);
  return response.data;
}

export async function listCandidates() {
  const response = await axios.get(`${PROFILE_API_URL}/profile/candidates`);
  return response.data;
}

export async function getCandidate(id) {
  const response = await axios.get(`${PROFILE_API_URL}/profile/candidates/${id}`);
  return response.data;
}

export async function updateCandidate(id, data) {
  const response = await axios.patch(`${PROFILE_API_URL}/profile/candidates/${id}`, {
    id,
    ...data,
  });
  return response.data;
}

export async function deleteCandidate(id) {
  const response = await axios.delete(`${PROFILE_API_URL}/profile/candidates/${id}`);
  return response.data;
}

/**
 * Upload a resume file.
 * @param {File} file - The File object from the browser
 * @param {string} uploadedBy - Email of the uploader
 */
export async function uploadResume(file, uploadedBy, overrideFileName) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result.split(',')[1];
        const response = await axios.post(`${PROFILE_API_URL}/profile/resume/upload`, {
          fileName: overrideFileName || file.name,
          fileBase64: base64,
          mimeType: file.type,
          uploadedBy,
        });
        resolve(response.data);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function matchJDtoCandidates(jdId) {
  const response = await axios.post(`${PROFILE_API_URL}/profile/match`, { jdId });
  return response.data;
}

export async function getMatchResults(jdId) {
  const response = await axios.get(`${PROFILE_API_URL}/profile/match-results`, {
    params: { jdId },
  });
  return response.data;
}

export async function generateJobDescription(data) {
  const response = await axios.post(`${PROFILE_API_URL}/profile/generate-jd`, data);
  return response.data;
}

export async function getResourceCalculationTemplates(countryCode = 'KSA') {
  const response = await axios.get(`${PROFILE_API_URL}/profile/resource-calculation-templates`, {
    params: { countryCode },
  });
  return response.data;
}

export async function listResourceCalculations() {
  const response = await axios.get(`${PROFILE_API_URL}/profile/resource-calculations`);
  return response.data;
}

export async function getResourceCalculation(id) {
  const response = await axios.get(`${PROFILE_API_URL}/profile/resource-calculations/${id}`);
  return response.data;
}

export async function createResourceCalculation(data) {
  const authHeaders = getAuthHeaders();
  const response = await axios.post(`${PROFILE_API_URL}/profile/resource-calculations`, data, {
    headers: authHeaders,
  });
  return response.data;
}

export async function updateResourceCalculation(id, data) {
  const authHeaders = getAuthHeaders();
  const response = await axios.patch(
    `${PROFILE_API_URL}/profile/resource-calculations/${id}`,
    { id, ...data },
    { headers: authHeaders }
  );
  return response.data;
}

export async function deleteResourceCalculation(id) {
  const authHeaders = getAuthHeaders();
  const response = await axios.delete(`${PROFILE_API_URL}/profile/resource-calculations/${id}`, {
    headers: authHeaders,
  });
  return response.data;
}

export async function submitRCForApproval(id) {
  const authHeaders = getAuthHeaders();
  let submittedBy = '';
  try {
    const u = JSON.parse(localStorage.getItem('user') || '{}');
    submittedBy = u.email || '';
  } catch {
    /* ignore */
  }
  const response = await axios.post(
    `${PROFILE_API_URL}/profile/resource-calculations/${id}/submit`,
    { id, submittedBy },
    { headers: authHeaders }
  );
  return response.data;
}

export async function forwardRC(id, data) {
  const authHeaders = getAuthHeaders();
  const response = await axios.post(
    `${PROFILE_API_URL}/profile/resource-calculations/${id}/forward`,
    { id, ...data },
    { headers: authHeaders }
  );
  return response.data;
}

export async function approveRC(id, data) {
  const authHeaders = getAuthHeaders();
  const response = await axios.post(
    `${PROFILE_API_URL}/profile/resource-calculations/${id}/approve`,
    { id, ...data },
    { headers: authHeaders }
  );
  return response.data;
}

// ============================================================
// Azure Billing
// ============================================================

const AZURE_BILLING_API_URL = process.env.NEXT_PUBLIC_SERVER_URL;

export async function getAzureBilling() {
  const response = await axios.get(`${AZURE_BILLING_API_URL}/azure/billing`);
  return response.data;
}

// ─── Candidate Intake — HR token management ──────────────────────────────────

export async function generateCandidateIntakeToken(data) {
  const response = await axios.post(`${API_BASE_URL}candidate-intake/tokens`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

export async function listCandidateIntakeTokens(params = {}) {
  const response = await axios.get(`${API_BASE_URL}candidate-intake/tokens`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
}

export async function revokeCandidateIntakeToken(id, revokedBy) {
  const response = await axios.post(
    `${API_BASE_URL}candidate-intake/tokens/${id}/revoke`,
    { revokedBy },
    { headers: getAuthHeaders() }
  );
  return response.data;
}

export async function listCandidateIntakeSubmissions(params = {}) {
  const response = await axios.get(`${API_BASE_URL}candidate-intake/submissions`, {
    headers: getAuthHeaders(),
    params,
  });
  return response.data;
}

export async function getCandidateIntakeSubmission(id) {
  const response = await axios.get(`${API_BASE_URL}candidate-intake/submissions/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
}

// ─── Candidate Intake — candidate-facing (no dashboard JWT) ──────────────────

export async function getCandidateIntakeToken(token) {
  const response = await axios.get(`${API_BASE_URL}candidate-intake/tokens/${token}`);
  return response.data;
}

export async function requestCandidateIntakeOtp(token, email) {
  const response = await axios.post(`${API_BASE_URL}candidate-intake/tokens/${token}/request-otp`, {
    email,
  });
  return response.data;
}

export async function verifyCandidateIntakeOtp(token, email, code) {
  const response = await axios.post(`${API_BASE_URL}candidate-intake/tokens/${token}/verify-otp`, {
    email,
    code,
  });
  return response.data;
}

export async function submitCandidateIntakeForm(token, sessionToken, formData) {
  const response = await axios.post(`${API_BASE_URL}candidate-intake/tokens/${token}/submit`, {
    sessionToken,
    ...formData,
  });
  return response.data;
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
  deleteExpense,
  uploadExpenseAttachment,
  createInvoice,
  fetchInvoices,
  fetchInvoice,
  fetchOfficeConfigs,
  deleteInvoice,
  updateInvoice,
  issueInvoice,
  approveInvoice,
  markInvoicePaid,
  fetchProformaInvoices,
  fetchProformaInvoice,
  updateProformaInvoice,
  approveProformaInvoice,
  dispatchProformaInvoice,
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
  fetchUsersWithRoles,
  setUserRoleApi,
  assignManagerApi,
  fetchManagerUsers,
  fetchNavPermissions,
  refreshNavPermissionsCache,
  fetchUserNavPermissions,
  fetchUserEnabledPaths,
  setUserNavPermissions,
  grantDefaultPermissions,
  // Enterprise App Access
  fetchEnterpriseAppUsers,
  addEnterpriseAppUser,
  removeEnterpriseAppUser,
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
  requestNdaOtp,
  verifyNdaOtp,
  finalizeNda,
  cancelNda,
  uploadExternalNdaDocument,
  setNdaStampPlacements,
  // Wallet management
  getWallets,
  getWallet,
  getWalletTransactions,
  topUpWallet,
  deductFromWallet,
  adjustWallet,
  // Employee ID Management
  listEmployeeIds,
  getEmployeeIdRecord,
  updateEmployeeId,
  getExpiringDocuments,
  getComplianceDashboard,
  getSceMemberships,
  createSceMembership,
  updateSceMembership,
  // Insurance Management
  listInsuranceRecords,
  getInsuranceRecord,
  createInsuranceRecord,
  updateInsuranceRecord,
  listDependents,
  createDependent,
  updateDependent,
  listInsuranceProviders,
  createInsuranceProvider,
  updateInsuranceProvider,
  getInsuranceDashboard,
  // Employee Requests Management
  listRequests,
  getRequestWithApprovals,
  createVisaRequest,
  updateVisaRequest,
  createServiceRequest,
  updateServiceRequest,
  createReimbursementRequest,
  updateReimbursementRequest,
  submitApproval,
  listPendingApprovals,
  getRequestsDashboard,
  createTravelRequest,
  updateTravelRequest,
  createLetterRequest,
  updateLetterRequest,
  // Audit Log
  getAuditLog,
  // Document Management
  uploadDocument,
  generateSalaryCertificate,
  generateLetterDocument,
  // Quran API
  fetchQuranVerse,
  fetchQuranTafsir,
  // Policy Management
  getPolicies,
  getPolicyById,
  getPolicyAcknowledgements,
  getPolicyAcknowledgementsByEmployee,
  sendPolicyLinksToEmployee,
  sendPoliciesToSelectedEmployees,
  getPolicyBySigningToken,
  signPolicy,
  seedPolicies,
  updatePolicy,
  getPolicyRoleAssignments,
  assignPoliciesToRole,
  sendPoliciesByRole,
  // Sales Pipeline
  listPipelineDeals,
  getPipelineDeal,
  createPipelineDeal,
  updatePipelineDeal,
  deletePipelineDeal,
  updatePipelineDealStage,
  addPipelineActivity,
  // Sales Activity Ledger
  listLedgerEntries,
  getLedgerEntry,
  createLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntry,
  addLedgerActivity,
  // Profile / PRMS
  listJobDescriptions,
  getJobDescription,
  createJobDescription,
  updateJobDescription,
  deleteJobDescription,
  listCandidates,
  getCandidate,
  updateCandidate,
  deleteCandidate,
  uploadResume,
  matchJDtoCandidates,
  getMatchResults,
  generateJobDescription,
  getAzureBilling,
  // Candidate Intake
  generateCandidateIntakeToken,
  listCandidateIntakeTokens,
  revokeCandidateIntakeToken,
  listCandidateIntakeSubmissions,
  getCandidateIntakeSubmission,
  getCandidateIntakeToken,
  requestCandidateIntakeOtp,
  verifyCandidateIntakeOtp,
  submitCandidateIntakeForm,
  // TOTP / Microsoft Authenticator
  totpSetup,
  totpVerifySetup,
  totpVerify,
  totpStatus,
  totpUnlock,
  totpReset,
};

// ─── TOTP / Microsoft Authenticator ────────────────────────────────────────

/**
 * Initiates TOTP setup for a user. Returns otpauthUri for QR code and the secret.
 * @param {string} userId - The user's database UUID.
 */
export async function totpSetup(userId) {
  const response = await axios.post(`${API_BASE_URL}totp/setup`, { userId });
  return response.data;
}

/**
 * Confirms TOTP setup by verifying the first code from the authenticator app.
 * @param {string} userId - The user's database UUID.
 * @param {string} code - The 6-digit TOTP code.
 */
export async function totpVerifySetup(userId, code) {
  const response = await axios.post(`${API_BASE_URL}totp/verify-setup`, { userId, code });
  return response.data;
}

/**
 * Verifies a TOTP code before a sensitive action (e.g., invoice approval).
 * Throws if TOTP not set up or code is invalid.
 * @param {string} userId - The user's database UUID.
 * @param {string} code - The 6-digit TOTP code.
 */
export async function totpVerify(userId, code) {
  const response = await axios.post(`${API_BASE_URL}totp/verify`, { userId, code });
  return response.data;
}

/**
 * Checks whether TOTP is enabled for a user.
 * @param {string} userId - The user's database UUID.
 */
export async function totpStatus(userId) {
  const response = await axios.get(`${API_BASE_URL}totp/status/${encodeURIComponent(userId)}`);
  return response.data;
}

export async function totpUnlock(userId) {
  const response = await axios.post(`${API_BASE_URL}totp/unlock`, { userId });
  return response.data;
}

export async function totpReset(userId) {
  const response = await axios.post(`${API_BASE_URL}totp/reset`, { userId });
  return response.data;
}
