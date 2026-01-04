'use client';

import { useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { toast } from 'src/components/snackbar';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { useAuthContext } from 'src/auth/hooks';

import { VendorCreateEditForm } from '../vendor-create-edit-form';

// ----------------------------------------------------------------------

export function VendorEditView({ vendor }) {
  const router = useRouter();
  const { user } = useAuthContext();

  const roleIdToName = { 1: 'regular', 2: 'manager', 3: 'admin', 4: 'superAdmin' };
  const normalizedRole = user?.role || roleIdToName[user?.roleId] || 'regular';
  const canEdit = normalizedRole === 'superAdmin';

  useEffect(() => {
    if (!canEdit) {
      toast.error('Only super admins can edit vendors');
      router.replace(paths.dashboard.vendor.root);
    }
  }, [canEdit, router]);

  if (!canEdit) return null;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Vendor', href: paths.dashboard.vendor.root },
          { name: vendor?.vendorName },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <VendorCreateEditForm currentVendor={vendor} />
    </DashboardContent>
  );
}
