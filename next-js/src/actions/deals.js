import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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

export async function getDeals() {
  try {
    const response = await axios.get(`${API_BASE_URL}/deals`, { headers: { ...getAuthHeader() } });
    return response.data.deals || [];
  } catch (error) {
    console.error('Error fetching deals:', error);
    return [];
  }
}

export async function getDeal(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/deals/${id}`, {
      headers: { ...getAuthHeader() },
    });
    return response.data.deal;
  } catch (error) {
    const status = error?.response?.status;
    console.error(`Error fetching deal ${id}:`, status, error?.response?.data || error.message);
    return null;
  }
}

export async function createDeal(dealData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/deals`, dealData, {
      headers: { ...getAuthHeader() },
    });
    return response.data.deal;
  } catch (error) {
    console.error('Error creating deal:', error);
    throw error;
  }
}

export async function updateDeal(id, dealData) {
  try {
    const response = await axios.patch(`${API_BASE_URL}/deals/${id}`, dealData, {
      headers: { ...getAuthHeader() },
    });
    return response.data.deal;
  } catch (error) {
    console.error(`Error updating deal ${id}:`, error);
    throw error;
  }
}

export async function deleteDeal(id) {
  try {
    await axios.delete(`${API_BASE_URL}/deals/${id}`, { headers: { ...getAuthHeader() } });
    return true;
  } catch (error) {
    console.error(`Error deleting deal ${id}:`, error);
    throw error;
  }
}

const extractErrorMessage = (error, fallback = 'Request failed') => {
  const data = error?.response?.data;
  return (
    data?.message ||
    data?.error ||
    data?.error_description ||
    data?.details ||
    error?.message ||
    fallback
  );
};

export async function payBDMCommission(dealId, { amount, expenseId } = {}) {
  try {
    const payload = {};

    if (typeof amount === 'number') {
      payload.amount = amount;
    }

    if (expenseId) {
      payload.expenseId = expenseId;
    }

    const response = await axios.post(`${API_BASE_URL}/deals/${dealId}/pay-bdm`, payload, {
      headers: { ...getAuthHeader() },
    });
    return response.data.deal;
  } catch (error) {
    const message = extractErrorMessage(error, 'Failed to pay BDM commission');
    console.error(`Error paying BDM for deal ${dealId}:`, {
      message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    throw new Error(message);
  }
}
