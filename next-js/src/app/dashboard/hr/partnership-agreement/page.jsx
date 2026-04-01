'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { DashboardContent } from 'src/layouts/dashboard';

import { Iconify } from 'src/components/iconify';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';

// ── TODO ─────────────────────────────────────────────────────────────────────
// Partnership Agreements — full implementation mirrors NDA Management:
//  • iota_generated mode  → generate agreement from a IOTA template
//  • external_upload mode → upload partner document (PDF / DOCX / DOC)
//  • Signing flow          → IOTA + partner signatories, signature canvas
//  • IOTA stamp placement  → pdf-lib embeds /public/logo/iota-stamp.png
//  • OneDrive upload       → signed file stored via client_credentials token
// ─────────────────────────────────────────────────────────────────────────────

export default function PartnershipAgreementPage() {
  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading="Partnership Agreements"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.hr.root },
          { name: 'Partnership Agreements' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 6, textAlign: 'center' }}>
        <Iconify icon="solar:document-add-bold" width={64} sx={{ color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" sx={{ mb: 1 }}>
          Coming Soon
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
          Partnership Agreement management is under development. It will mirror the NDA Management
          module and support both template-generated agreements and external document uploads, IOTA
          stamp placement, and the full signing workflow.
        </Typography>
        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: 'warning.lighter',
            borderRadius: 1,
            display: 'inline-block',
          }}
        >
          <Typography variant="caption" color="warning.darker">
            TODO: implement full Partnership Agreement module (backend + frontend)
          </Typography>
        </Box>
      </Card>
    </DashboardContent>
  );
}
