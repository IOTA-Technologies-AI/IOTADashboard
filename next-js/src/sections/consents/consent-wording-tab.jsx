'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { fDate } from 'src/utils/format-time';

import { apiMessage, useConsentTexts } from 'src/actions/consents';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * Every consent IOTA asks for, word for word, as people see it — with each
 * version, since records point at the version a person agreed to. The wording
 * lives in the API (shared/consent-texts.ts) and changes through a release.
 */
export function ConsentWordingTab() {
  const { wording, error, loading } = useConsentTexts();

  return (
    <Stack spacing={3}>
      <Alert severity="info">
        This is the exact wording each form shows. Every consent records the version the person saw.
        Wording changes go through legal review and a release, and add a new version; old versions
        stay so past consents can still be read. Privacy notice:{' '}
        {wording ? (
          <Link href={wording.notice.url} target="_blank" rel="noopener">
            version {wording.notice.version}
          </Link>
        ) : (
          '—'
        )}
        {wording ? ` · privacy requests to ${wording.contact}` : ''}
      </Alert>

      {loading ? <LinearProgress /> : null}
      {error ? (
        <Alert severity="error">{apiMessage(error, 'The wording could not be loaded.')}</Alert>
      ) : null}

      {wording?.texts.map((t) => {
        const [current, ...older] = t.versions;
        return (
          <Card key={t.key} sx={{ p: 3 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              spacing={1}
              sx={{ mb: 1.5 }}
            >
              <Box>
                <Typography variant="subtitle1">{t.title}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {t.shownOn}
                </Typography>
              </Box>
              <Stack alignItems={{ sm: 'flex-end' }}>
                <Label color="success">Current</Label>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  {current.version} · since {fDate(current.since)}
                </Typography>
              </Stack>
            </Stack>
            <Box
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: 'background.neutral',
                typography: 'body2',
                whiteSpace: 'pre-line',
              }}
            >
              {current.text}
            </Box>
            {older.length ? (
              <Accordion
                disableGutters
                elevation={0}
                sx={{ mt: 1.5, '&:before': { display: 'none' } }}
              >
                <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
                  <Typography variant="body2" color="text.secondary">
                    {older.length} earlier version{older.length > 1 ? 's' : ''}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Stack spacing={2}>
                    {older.map((v) => (
                      <Box key={v.version}>
                        <Typography variant="caption" color="text.secondary">
                          {v.version} · from {fDate(v.since)}
                        </Typography>
                        <Typography variant="body2">{v.text}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ) : null}
          </Card>
        );
      })}
    </Stack>
  );
}
