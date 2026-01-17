'use server';

import api from '../utils/apiHelper';

import { AVAILABLE_INTEGRATIONS } from '../sections/integration/integration-constants';

// ----------------------------------------------------------------------
// API FUNCTIONS
// ----------------------------------------------------------------------

/**
 * Get all integrations
 */
export async function getIntegrations(params = {}) {
  try {
    const response = await api.getIntegrations(params);
    return response || [];
  } catch (error) {
    console.error('Error fetching integrations:', error);
    return [];
  }
}

/**
 * Get a single integration by name and type
 */
export async function getIntegration(name, type) {
  try {
    const response = await api.getIntegration(name, type);
    return response;
  } catch (error) {
    console.error('Error fetching integration:', error);
    return null;
  }
}

/**
 * Create a new integration
 */
export async function createIntegration(data) {
  try {
    const response = await api.createIntegration(data);
    return response;
  } catch (error) {
    console.error('Error creating integration:', error);
    throw error;
  }
}

/**
 * Update an existing integration
 */
export async function updateIntegration(name, type, data) {
  try {
    const response = await api.updateIntegration(name, type, data);
    return response;
  } catch (error) {
    console.error('Error updating integration:', error);
    throw error;
  }
}

/**
 * Delete an integration
 */
export async function deleteIntegration(name, type) {
  try {
    await api.deleteIntegration(name, type);
    return { success: true };
  } catch (error) {
    console.error('Error deleting integration:', error);
    throw error;
  }
}

/**
 * Test integration connection
 */
export async function testIntegrationConnection(name, type) {
  try {
    const response = await api.testIntegrationConnection(name, type);
    return response;
  } catch (error) {
    console.error('Error testing integration:', error);
    throw error;
  }
}

/**
 * Get integration details with available config
 */
export async function getIntegrationConfig(name) {
  return AVAILABLE_INTEGRATIONS.find((i) => i.name === name) || null;
}
