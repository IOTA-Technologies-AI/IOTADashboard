'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// TODO: Build the New Partnership Agreement form — mirrors nda-management/new/page.jsx

export default function PartnershipAgreementNewPage() {
  const router = useRouter();

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="New Partnership Agreement"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          {
            name: 'Partnership Agreements',
            href: paths.dashboard.hr.partnershipAgreement.root,
          },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 6, textAlign: 'center' }}>
        <Iconify icon="solar:document-add-bold" width={64} sx={{ color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" sx={{ mb: 1 }}>
          Coming Soon
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
          The New Partnership Agreement form is under development. It will support both
          template-generated and externally uploaded agreements.
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:arrow-left-bold" />}
            onClick={() => router.push(paths.dashboard.hr.partnershipAgreement.root)}
          >
            Back
          </Button>
        </Box>
      </Card>
    </DashboardContent>
  );
}
