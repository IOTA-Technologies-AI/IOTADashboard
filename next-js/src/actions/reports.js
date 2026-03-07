'use server';

const API_BASE_URL = 'https://staging-iotaapiserver-s572.encr.app';

/**
 * Fetch P&L report data from the backend.
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
