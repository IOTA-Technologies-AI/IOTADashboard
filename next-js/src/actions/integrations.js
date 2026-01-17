'use server';

import api from '../utils/apiHelper';

// ----------------------------------------------------------------------
// INTEGRATION TYPES & OPTIONS
// ----------------------------------------------------------------------

export const INTEGRATION_TYPES = [
  {
    value: 'cms',
    label: 'CMS',
    description: 'Content Management Systems',
  },
  {
    value: 'payment',
    label: 'Payment',
    description: 'Payment Gateways',
  },
  {
    value: 'email',
    label: 'Email',
    description: 'Email Services',
  },
  {
    value: 'storage',
    label: 'Storage',
    description: 'Cloud Storage',
  },
  {
    value: 'analytics',
    label: 'Analytics',
    description: 'Analytics & Tracking',
  },
  {
    value: 'social',
    label: 'Social',
    description: 'Social Media Platforms',
  },
  {
    value: 'crm',
    label: 'CRM',
    description: 'Customer Relationship Management',
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Other Integrations',
  },
];

export const AVAILABLE_INTEGRATIONS = [
  {
    name: 'webflow',
    displayName: 'Webflow',
    type: 'cms',
    description: 'Publish jobs to IOTA Career Site on Webflow',
    icon: 'simple-icons:webflow',
    color: '#4353FF',
    requiredFields: ['apiKey', 'siteId', 'collectionId'],
    optionalFields: ['webhookUrl'],
    docsUrl: 'https://developers.webflow.com/',
  },
  {
    name: 'linkedin',
    displayName: 'LinkedIn',
    type: 'social',
    description: 'Post jobs and content to LinkedIn',
    icon: 'mdi:linkedin',
    color: '#0A66C2',
    requiredFields: ['accessToken', 'refreshToken'],
    optionalFields: ['companyId'],
    docsUrl: 'https://developer.linkedin.com/',
    comingSoon: true,
  },
  {
    name: 'zoho',
    displayName: 'Zoho',
    type: 'crm',
    description: 'Sync invoices and contacts with Zoho',
    icon: 'simple-icons:zoho',
    color: '#C8202B',
    requiredFields: ['accessToken', 'refreshToken', 'organizationId'],
    optionalFields: [],
    docsUrl: 'https://www.zoho.com/developer/',
  },
  {
    name: 'microsoft',
    displayName: 'Microsoft 365',
    type: 'storage',
    description: 'OneDrive & SharePoint integration',
    icon: 'mdi:microsoft',
    color: '#00A4EF',
    requiredFields: ['accessToken', 'refreshToken'],
    optionalFields: ['tenantId', 'driveId'],
    docsUrl: 'https://developer.microsoft.com/en-us/graph',
  },
  {
    name: 'supabase',
    displayName: 'Supabase',
    type: 'storage',
    description: 'Database and authentication backend',
    icon: 'simple-icons:supabase',
    color: '#3ECF8E',
    requiredFields: ['apiKey', 'baseUrl'],
    optionalFields: [],
    docsUrl: 'https://supabase.com/docs',
  },
  {
    name: 'stripe',
    displayName: 'Stripe',
    type: 'payment',
    description: 'Payment processing for subscriptions',
    icon: 'mdi:credit-card',
    color: '#635BFF',
    requiredFields: ['apiKey', 'apiSecret'],
    optionalFields: ['webhookUrl'],
    docsUrl: 'https://stripe.com/docs',
    comingSoon: true,
  },
  {
    name: 'sendgrid',
    displayName: 'SendGrid',
    type: 'email',
    description: 'Transactional and marketing emails',
    icon: 'simple-icons:sendgrid',
    color: '#1A82E2',
    requiredFields: ['apiKey'],
    optionalFields: [],
    docsUrl: 'https://docs.sendgrid.com/',
    comingSoon: true,
  },
  {
    name: 'google-analytics',
    displayName: 'Google Analytics',
    type: 'analytics',
    description: 'Website traffic and user analytics',
    icon: 'mdi:google-analytics',
    color: '#E37400',
    requiredFields: ['trackingId'],
    optionalFields: ['apiSecret'],
    docsUrl: 'https://developers.google.com/analytics',
    comingSoon: true,
  },
];

export const INTEGRATION_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'error', label: 'Error' },
];

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
export function getIntegrationConfig(name) {
  return AVAILABLE_INTEGRATIONS.find((i) => i.name === name) || null;
}
