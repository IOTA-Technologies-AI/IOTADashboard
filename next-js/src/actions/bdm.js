const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

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

export async function getBDMs() {
  try {
    const response = await fetch(`${API_URL}/bdms`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
    const response = await fetch(`${API_URL}/bdms/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      cache: 'no-store',
    });
    if (!response.ok) {
      console.error('Error response fetching BDM:', response.status, response.statusText);
      return null;
    }

    const text = await response.text();
    if (!text) {
      console.error('Empty BDM response body');
      return null;
    }

    try {
      const data = JSON.parse(text);
      return data?.bdm || null;
    } catch (parseError) {
      console.error('Error parsing BDM response:', parseError, text.slice(0, 200));
      return null;
    }
  } catch (error) {
    console.error('Error fetching BDM:', error);
    return null;
  }
}

export async function createBDM(bdmData) {
  try {
    const response = await fetch(`${API_URL}/bdm.createBDM`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
      headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
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
