import axios from 'axios';

const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app';

export async function getDeals() {
  try {
    const response = await axios.get(`${API_BASE_URL}/deals`);
    return response.data.deals || [];
  } catch (error) {
    console.error('Error fetching deals:', error);
    return [];
  }
}

export async function getDeal(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/deals/${id}`);
    return response.data.deal;
  } catch (error) {
    const status = error?.response?.status;
    console.error(`Error fetching deal ${id}:`, status, error?.response?.data || error.message);
    return null;
  }
}

export async function createDeal(dealData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/deals`, dealData);
    return response.data.deal;
  } catch (error) {
    console.error('Error creating deal:', error);
    throw error;
  }
}

export async function updateDeal(id, dealData) {
  try {
    const response = await axios.patch(`${API_BASE_URL}/deals/${id}`, dealData);
    return response.data.deal;
  } catch (error) {
    console.error(`Error updating deal ${id}:`, error);
    throw error;
  }
}

export async function deleteDeal(id) {
  try {
    await axios.delete(`${API_BASE_URL}/deals/${id}`);
    return true;
  } catch (error) {
    console.error(`Error deleting deal ${id}:`, error);
    throw error;
  }
}

export async function payBDMCommission(dealId, expenseId) {
  try {
    const response = await axios.post(`${API_BASE_URL}/deals/${dealId}/pay-bdm`, {
      expenseId,
    });
    return response.data.deal;
  } catch (error) {
    console.error(`Error paying BDM for deal ${dealId}:`, error);
    throw error;
  }
}
