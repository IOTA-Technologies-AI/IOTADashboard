'use client';

import { useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import Button from '@mui/material/Button';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { getBusinessVisaRequestById } from 'src/utils/apiHelper';

import { DashboardContent } from 'src/layouts/dashboard';

import { EmptyContent } from 'src/components/empty-content';
import { LoadingScreen } from 'src/components/loading-screen';

import { BusinessVisaDetailsView } from 'src/sections/hr/view/business-visa-details-view';

// The "View" action on the business visa list. Until this page existed the
// link led nowhere; editing has its own page beside it.
export default function BusinessVisaDetailsPage() {
  const { id } = useParams();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRequest = useCallback(async () => {
    try {
      setRequest(await getBusinessVisaRequestById(id));
    } catch (error) {
      console.error('Error fetching business visa request:', error);
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  if (loading) return <LoadingScreen />;

  if (!request) {
    return (
      <DashboardContent>
        <EmptyContent
          filled
          title="Request not found"
          description="This business visa request does not exist or could not be loaded."
          action={
            <Button
              component={RouterLink}
              href={paths.dashboard.hr.businessVisa.root}
              variant="contained"
            >
              Back to requests
            </Button>
          }
        />
      </DashboardContent>
    );
  }

  return <BusinessVisaDetailsView request={request} />;
}
