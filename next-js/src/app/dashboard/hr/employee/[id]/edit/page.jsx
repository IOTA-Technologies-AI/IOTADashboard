'use client';

import { useState, useEffect, useCallback } from 'react';

import { paths } from 'src/routes/paths';

import { getEmployeeById } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

import { EmployeeNewEditForm } from 'src/sections/hr/view/employee-new-edit-form';

export default function EmployeeEditPage({ params }) {
  const { id } = params;
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEmployee = useCallback(async () => {
    try {
      const data = await getEmployeeById(id);
      setEmployee(data);
    } catch (error) {
      console.error('Error fetching employee:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  if (loading) return <div>Loading...</div>;

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Edit Employee"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Employees', href: paths.dashboard.hr.employee.root },
          { name: employee?.firstName || 'Edit' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <EmployeeNewEditForm currentEmployee={employee} />
    </DashboardContent>
  );
}
