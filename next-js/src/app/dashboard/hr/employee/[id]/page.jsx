'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getEmployeeById } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';

import { EmployeeDetailsView } from 'src/sections/hr/view/employee-details-view';

// The "View" action on the employee list. Until this page existed the link
// led nowhere; editing has its own page beside it.
export default function EmployeeDetailsPage() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchEmployee = useCallback(async () => {
    try {
      setEmployee(await getEmployeeById(id));
    } catch (error) {
      console.error('Error fetching employee:', error);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchEmployee();
  }, [fetchEmployee]);

  if (loading) return <LoadingScreen />;

  if (!employee) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title="Employee not found"
          description="This employee record does not exist or could not be loaded."
          action={
            <Button
              component={RouterLink}
              href={paths.dashboard.hr.employee.root}
              variant="contained"
            >
              Back to employees
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  return <EmployeeDetailsView employee={employee} />;
}
