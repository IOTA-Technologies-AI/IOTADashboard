'use client';

import { PermissionGuard } from './permission-guard';

/**
 * PageGuard - Wraps page content with PermissionGuard
 * Use this to protect individual pages from unauthorized access
 *
 * Example:
 * export default function Page() {
 *   return <PageGuard><YourPageContent /></PageGuard>;
 * }
 */
export function PageGuard({ children }) {
  return <PermissionGuard>{children}</PermissionGuard>;
}
