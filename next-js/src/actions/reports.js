'use server';

const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app';

/**
 * Fetch P&L report data from the backend.
 * Returns current year + previous year data for YoY comparison.
 * @param {object} params
 * @param {number} params.year
 * @param {'month'|'quarter'} [params.groupBy='month']
 * @param {'overall'|'deal'|'resource'|'costCenter'} [params.dimension='overall']
 */
export async function fetchPLReport({ year, groupBy = 'month', dimension = 'overall' }) {
  try {
    const url = `${API_BASE_URL}/reports/pl?year=${year}&groupBy=${groupBy}&dimension=${dimension}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[fetchPLReport] Error:', error);
    return { error: error.message };
  }
}

/**
 * Fetch Employee P&L report — payroll cost, deal revenue, commissions and net contribution per person.
 * @param {object} params
 * @param {number} params.year
 */
export async function fetchEmployeePLReport({ year }) {
  try {
    const url = `${API_BASE_URL}/reports/employee?year=${year}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`HTTP ${response.status}: ${errText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[fetchEmployeePLReport] Error:', error);
    return { error: error.message };
  }
}
