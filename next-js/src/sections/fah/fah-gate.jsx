'use client';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';

import { useTranslate } from 'src/locales';
import { fahError, useFahMe } from 'src/actions/fah';

import { EmptyContent } from 'src/components/empty-content';

// ----------------------------------------------------------------------

/**
 * t() for the Accounting screens (namespace "fah"), whether the language is
 * Arabic, and the display name of a row that has nameEn/nameAr.
 * Call t(key, 'English default'): English needs no key file.
 */
export function useFahT() {
  const { t, currentLang } = useTranslate('fah');
  const isAr = currentLang?.value === 'ar';
  const nameOf = (row) => (isAr && row?.nameAr) || row?.nameEn || row?.name || '';
  return { t, isAr, nameOf };
}

const RANK_NAME = {
  1: 'a finance role',
  2: 'the accountant role or above',
  3: 'the controller role or above',
  4: 'the CFO role',
};

/**
 * Shows its children only to people with a finance role of at least
 * `minRank` (1 read, 2 accountant, 3 controller, 4 CFO). The API checks the
 * same on every call; this only spares people a screen of errors.
 * `children` may be a function of `me`.
 */
export function FahGate({ minRank = 1, children }) {
  const { t } = useFahT();
  const { me, loading, error } = useFahMe();

  if (loading) {
    return (
      <Box sx={{ py: 10 }}>
        <LinearProgress sx={{ maxWidth: 320, mx: 'auto' }} />
      </Box>
    );
  }
  if (error) return <Alert severity="error">{fahError(error)}</Alert>;
  if (!me || me.rank < minRank) {
    return (
      <EmptyContent
        filled
        title={t('gate.title', 'This needs {{what}}', {
          what: t(`gate.rank${minRank}`, RANK_NAME[minRank]),
        })}
        description={t(
          'gate.description',
          'Finance roles are given by the CFO or a super-admin in Accounting → Access.'
        )}
        sx={{ py: 10 }}
      />
    );
  }
  return typeof children === 'function' ? children(me) : children;
}
