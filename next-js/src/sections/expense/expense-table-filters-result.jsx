import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { fDateRangeShortLabel } from 'src/utils/format-time';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

export function ExpenseTableFiltersResult({ filters, totalResults, onResetPage, sx }) {
  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters;

  const handleRemoveKeyword = useCallback(() => {
    onResetPage();
    updateFilters({ name: '' });
  }, [onResetPage, updateFilters]);

  const handleRemoveStatus = useCallback(() => {
    onResetPage();
    updateFilters({ status: 'all' });
  }, [onResetPage, updateFilters]);

  const handleRemoveCurrency = useCallback(
    (currency) => {
      const newCurrencies = currentFilters.currencies.filter((item) => item !== currency);
      onResetPage();
      updateFilters({ currencies: newCurrencies });
    },
    [currentFilters.currencies, onResetPage, updateFilters]
  );

  const handleRemoveDate = useCallback(() => {
    onResetPage();
    updateFilters({ startDate: null, endDate: null });
  }, [onResetPage, updateFilters]);

  const handleReset = useCallback(() => {
    onResetPage();
    resetFilters();
  }, [onResetPage, resetFilters]);

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      <FiltersBlock label="Status:" isShow={currentFilters.status !== 'all'}>
        <Chip
          {...chipProps}
          label={
            currentFilters.status === 'approved'
              ? 'Approved'
              : currentFilters.status === 'rejected'
                ? 'Rejected'
                : 'Pending'
          }
          onDelete={handleRemoveStatus}
          sx={{ textTransform: 'capitalize' }}
        />
      </FiltersBlock>

      <FiltersBlock label="Currencies:" isShow={!!currentFilters.currencies.length}>
        {currentFilters.currencies.map((currency) => (
          <Chip
            {...chipProps}
            key={currency}
            label={currency}
            onDelete={() => handleRemoveCurrency(currency)}
          />
        ))}
      </FiltersBlock>

      <FiltersBlock
        label="Date:"
        isShow={Boolean(currentFilters.startDate && currentFilters.endDate)}
      >
        <Chip
          {...chipProps}
          label={fDateRangeShortLabel(currentFilters.startDate, currentFilters.endDate)}
          onDelete={handleRemoveDate}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!currentFilters.name}>
        <Chip {...chipProps} label={currentFilters.name} onDelete={handleRemoveKeyword} />
      </FiltersBlock>
    </FiltersResult>
  );
}
