'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import { paths } from 'src/routes/paths';

import { getLeaveRequestById } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { LeaveNewEditForm } from 'src/sections/hr/view/leave-new-edit-form';

export default function LeaveEditPage() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRequest = useCallback(async () => {
    try {
      const data = await getLeaveRequestById(id);
      setRequest(data);
    } catch (error) {
      console.error('Error fetching leave request:', error);
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
        heading="Edit Leave Request"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Leave', href: paths.dashboard.hr.leave.root },
          { name: request?.requestNumber || 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />
      <LeaveNewEditForm currentRequest={request} />
    </DashboardContent>
  );
}
