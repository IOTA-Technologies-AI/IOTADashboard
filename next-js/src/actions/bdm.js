'use server';

const API_URL = 'https://staging-iotaapiserver-s572.encr.app';

export async function getBDMs() {
  try {
    const response = await fetch(`${API_URL}/bdms`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Failed to fetch BDMs');
    const data = await response.json();
    return data.bdms || [];
  } catch (error) {
    console.error('Error fetching BDMs:', error);
    return [];
  }
}

export async function getBDM(id) {
  try {
    const response = await fetch(`${API_URL}/bdm.getBDM`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Failed to fetch BDM');
    const data = await response.json();
    return data.bdm;
  } catch (error) {
    console.error('Error fetching BDM:', error);
    throw error;
  }
}

export async function createBDM(bdmData) {
  try {
    const response = await fetch(`${API_URL}/bdm.createBDM`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bdmData),
    });
    if (!response.ok) throw new Error('Failed to create BDM');
    const data = await response.json();
    return data.bdm;
  } catch (error) {
    console.error('Error creating BDM:', error);
    throw error;
  }
}

export async function updateBDM(id, bdmData) {
  try {
    const response = await fetch(`${API_URL}/bdm.updateBDM`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...bdmData }),
    });
    if (!response.ok) throw new Error('Failed to update BDM');
    const data = await response.json();
    return data.bdm;
  } catch (error) {
    console.error('Error updating BDM:', error);
    throw error;
  }
}

export async function getBDMCommissions(id) {
  try {
    const response = await fetch(`${API_URL}/bdm.getBDMCommissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Failed to fetch BDM commissions');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching BDM commissions:', error);
    throw error;
  }
}

export async function getPendingBDMCommissions(id) {
  try {
    const response = await fetch(`${API_URL}/bdm.getPendingBDMCommissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error('Failed to fetch pending BDM commissions');
    const data = await response.json();
    return data.commissions || [];
  } catch (error) {
    console.error('Error fetching pending BDM commissions:', error);
    return [];
  }
}

export async function markCommissionsPaid(id, invoiceIds, expenseIds) {
  try {
    const response = await fetch(`${API_URL}/bdm.markCommissionsPaid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, invoiceIds, expenseIds }),
    });
    if (!response.ok) throw new Error('Failed to mark commissions as paid');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error marking commissions as paid:', error);
    throw error;
  }
}
