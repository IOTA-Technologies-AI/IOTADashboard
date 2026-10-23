'use client';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';

import { useFahT } from './fah-gate';
import { Code, ActiveLabel, DimensionTable } from './dimension-shared';

// ----------------------------------------------------------------------

/** Books (legal entities) and locations: read-only, seeded by the migration. */
export function DimensionBooks({ entities, locations }) {
  const { t, nameOf } = useFahT();
  const bookCode = (id) => entities.find((e) => e.id === id)?.shortCode ?? '—';

  return (
    <Box sx={{ display: 'grid', gap: 3 }}>
      <DimensionTable
        title={t('dims.books', 'Books')}
        help={t(
          'dims.booksHelp',
          'One ledger per legal entity, each with its own VAT, receivables and payables. All kept in SAR.'
        )}
        rows={entities}
        minWidth={860}
        columns={[
          {
            key: 'short',
            label: t('dims.shortCode', 'Short code'),
            width: 110,
            render: (e) => <Code>{e.shortCode}</Code>,
          },
          {
            key: 'name',
            label: t('dims.name', 'Name'),
            render: (e) => (
              <Box>
                <Typography variant="body2">{e.nameEn}</Typography>
                {e.nameAr && (
                  <Typography variant="caption" color="text.secondary" dir="rtl">
                    {e.nameAr}
                  </Typography>
                )}
              </Box>
            ),
          },
          { key: 'code', label: t('dims.code', 'Code'), render: (e) => <Code>{e.code}</Code> },
          {
            key: 'vat',
            label: t('dims.vatNumber', 'VAT number'),
            render: (e) => e.vatNumber || '—',
          },
          {
            key: 'currency',
            label: t('dims.functionalCurrency', 'Currency'),
            render: (e) => e.functionalCurrency,
          },
          {
            key: 'active',
            label: t('dims.status', 'Status'),
            render: (e) =>
              e.isActive ? (
                <ActiveLabel active />
              ) : (
                <Label variant="soft" color="default">
                  {e.code === 'iota-india'
                    ? t('dims.indiaPending', 'Starts when India bills')
                    : t('dims.inactive', 'Inactive')}
                </Label>
              ),
          },
        ]}
      />
      <DimensionTable
        title={t('dims.locations', 'Locations')}
        help={t('dims.locationsHelp', 'Offices, and the book each one reports in.')}
        rows={locations}
        minWidth={560}
        columns={[
          {
            key: 'code',
            label: t('dims.code', 'Code'),
            width: 160,
            render: (l) => <Code>{l.code}</Code>,
          },
          { key: 'name', label: t('dims.name', 'Name'), render: (l) => nameOf(l) },
          { key: 'country', label: t('dims.country', 'Country'), render: (l) => l.country },
          { key: 'book', label: t('dims.book', 'Book'), render: (l) => bookCode(l.legalEntityId) },
        ]}
      />
    </Box>
  );
}
