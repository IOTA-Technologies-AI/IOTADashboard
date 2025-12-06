/**
 * BDM Constants and Utilities
 */

export const COMMISSION_TYPES = {
  FIXED: 'fixed',
  PERCENTAGE: 'percentage',
};

export const COMMISSION_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Fixed Amount (SAR)' },
  { value: 'percentage', label: 'Percentage (%)' },
];

export const BDM_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
};

export const BDM_STATUS_OPTIONS = [
  { value: 'active', label: 'Active', color: 'success' },
  { value: 'inactive', label: 'Inactive', color: 'default' },
  { value: 'suspended', label: 'Suspended', color: 'error' },
];

/**
 * Validate commission value based on type
 */
export function validateCommissionValue(type, value) {
  const numValue = parseFloat(value);

  if (isNaN(numValue) || numValue < 0) {
    return { valid: false, error: 'Value must be a positive number' };
  }

  if (type === 'percentage' && numValue > 100) {
    return { valid: false, error: 'Percentage cannot exceed 100%' };
  }

  if (type === 'fixed' && numValue > 1000000) {
    return { valid: false, error: 'Fixed amount seems too high' };
  }

  return { valid: true };
}
