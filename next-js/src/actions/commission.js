import axios from 'axios';

const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app';

export async function getCommissions() {
  try {
    const response = await axios.get(`${API_BASE_URL}/commissions`);
    return response.data.commissions || [];
  } catch (error) {
    console.error('Error fetching commissions:', error);
    return [];
  }
}

export async function getCommission(id) {
  try {
    const response = await axios.get(`${API_BASE_URL}/commissions/${id}`);
    return response.data.commission;
  } catch (error) {
    const status = error?.response?.status;
    console.error(
      `Error fetching commission ${id}:`,
      status,
      error?.response?.data || error.message
    );
    return null;
  }
}

export async function createCommission(commissionData) {
  try {
    const response = await axios.post(`${API_BASE_URL}/commissions`, commissionData);
    return response.data.commission;
  } catch (error) {
    console.error('Error creating commission:', error);
    throw error;
  }
}

export async function updateCommission(id, commissionData) {
  try {
    const response = await axios.patch(`${API_BASE_URL}/commissions/${id}`, commissionData);
    return response.data.commission;
  } catch (error) {
    console.error(`Error updating commission ${id}:`, error);
    throw error;
  }
}

export async function deleteCommission(id) {
  try {
    await axios.delete(`${API_BASE_URL}/commissions/${id}`);
    return true;
  } catch (error) {
    console.error(`Error deleting commission ${id}:`, error);
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

export async function payBDMCommission(commissionId, { amount, expenseId } = {}) {
  try {
    const payload = {};

    if (typeof amount === 'number') {
      payload.amount = amount;
    }

    if (expenseId) {
      payload.expenseId = expenseId;
    }

    const response = await axios.post(
      `${API_BASE_URL}/commissions/${commissionId}/pay-bdm`,
      payload
    );
    return response.data.commission;
  } catch (error) {
    const message = extractErrorMessage(error, 'Failed to pay BDM commission');
    console.error(`Error paying BDM for commission ${commissionId}:`, {
      message,
      status: error?.response?.status,
      data: error?.response?.data,
    });
    throw new Error(message);
  }
}
