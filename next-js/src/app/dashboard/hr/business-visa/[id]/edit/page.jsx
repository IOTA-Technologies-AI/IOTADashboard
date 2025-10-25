'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { paths } from 'src/routes/paths';

import { getBusinessVisaRequestById } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { BusinessVisaNewEditForm } from 'src/sections/hr/view/business-visa-new-edit-form';

export default function BusinessVisaEditPage() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRequest = useCallback(async () => {
    try {
      const data = await getBusinessVisaRequestById(id);
      setRequest(data);
    } catch (error) {
      console.error('Error fetching business visa request:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  if (loading) return <div>Loading...</div>;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit Business Visa Request"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Business Visa Requests', href: paths.dashboard.hr.businessVisa.root },
          { name: request?.requestNumber || 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <BusinessVisaNewEditForm currentRequest={request} />
    </DashboardContent>
  );
}
