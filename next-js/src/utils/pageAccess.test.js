import { it, expect, describe } from 'vitest';

import { hasPathPermission } from './pageAccess';

describe('hasPathPermission (PermissionGuard)', () => {
  const allowed = ['/dashboard/invoice', '/dashboard/hr/nda-management/'];

  it('allows a granted page and the pages under it', () => {
    expect(hasPathPermission(allowed, '/dashboard/invoice')).toBe(true);
    expect(hasPathPermission(allowed, '/dashboard/invoice/42/edit')).toBe(true);
    expect(hasPathPermission(allowed, '/dashboard/hr/nda-management/7')).toBe(true);
  });

  it('does not treat a lookalike sibling as granted', () => {
    expect(hasPathPermission(allowed, '/dashboard/invoices')).toBe(false);
    expect(hasPathPermission(allowed, '/dashboard/payroll')).toBe(false);
  });

  it('honours the super-admin wildcard and the dashboard root', () => {
    expect(hasPathPermission(['*'], '/dashboard/anything')).toBe(true);
    expect(hasPathPermission([], '/dashboard')).toBe(true);
  });

  it('denies when there is nothing to check', () => {
    expect(hasPathPermission(undefined, '/dashboard/invoice')).toBe(false);
    expect(hasPathPermission(allowed, '')).toBe(false);
  });
});
