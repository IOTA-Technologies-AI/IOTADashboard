import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { formHelperTextClasses } from '@mui/material/FormHelperText';

import { Iconify } from 'src/components/iconify';

import { ExpenseTableFiltersResult } from './expense-table-filters-result';

// ----------------------------------------------------------------------

const EXPENSE_CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP', 'INR', 'AED'];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'pending', label: 'Pending' },
];

// ----------------------------------------------------------------------

export function ExpenseTableToolbar({ filters, onResetPage, dateError, dataFiltered }) {
  const { state: currentFilters, setState: updateFilters } = filters;

  const handleFilterName = useCallback(
    (event) => {
      onResetPage();
      updateFilters({ name: event.target.value });
    },
    [onResetPage, updateFilters]
  );

  const handleFilterStatus = useCallback(
    (event) => {
      onResetPage();
      updateFilters({ status: event.target.value });
    },
    [onResetPage, updateFilters]
  );

  const handleFilterCurrencies = useCallback(
    (event) => {
      const value =
        typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value;
      onResetPage();
      updateFilters({ currencies: value });
    },
    [onResetPage, updateFilters]
  );

  const handleFilterStartDate = useCallback(
    (newValue) => {
      onResetPage();
      updateFilters({ startDate: newValue });
    },
    [onResetPage, updateFilters]
  );

  const handleFilterEndDate = useCallback(
    (newValue) => {
      updateFilters({ endDate: newValue });
    },
    [updateFilters]
  );

  const handleToggleSortOrder = useCallback(() => {
    updateFilters({ sortOrder: currentFilters.sortOrder === 'asc' ? 'desc' : 'asc' });
  }, [currentFilters.sortOrder, updateFilters]);

  const canReset =
    !!currentFilters.name ||
    currentFilters.currencies.length > 0 ||
    currentFilters.status !== 'all' ||
    (!!currentFilters.startDate && !!currentFilters.endDate);

  return (
    <>
      <Box
        sx={{
          p: 2.5,
          gap: 2,
          display: 'flex',
          pr: { xs: 2.5, md: 1 },
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-end', md: 'center' },
        }}
      >
        {/* Status Filter */}
        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 180 } }}>
          <InputLabel>Status</InputLabel>
          <Select value={currentFilters.status} onChange={handleFilterStatus} label="Status">
            {STATUS_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Currency Filter */}
        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 180 } }}>
          <InputLabel>Currency</InputLabel>
          <Select
            multiple
            value={currentFilters.currencies}
            onChange={handleFilterCurrencies}
            label="Currency"
            renderValue={(selected) => selected.join(', ')}
          >
            {EXPENSE_CURRENCIES.map((currency) => (
              <MenuItem key={currency} value={currency}>
                <Checkbox
                  disableRipple
                  size="small"
                  checked={currentFilters.currencies.includes(currency)}
                />
                {currency}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Start Date */}
        <DatePicker
          label="Start date"
          value={currentFilters.startDate}
          onChange={handleFilterStartDate}
          sx={{ maxWidth: { md: 180 } }}
        />

        {/* End Date */}
        <DatePicker
          label="End date"
          value={currentFilters.endDate}
          onChange={handleFilterEndDate}
          slotProps={{
            textField: {
              error: dateError,
              helperText: dateError ? 'End date must be later than start date' : null,
            },
          }}
          sx={{
            maxWidth: { md: 180 },
            [`& .${formHelperTextClasses.root}`]: {
              position: { md: 'absolute' },
              bottom: { md: -40 },
            },
          }}
        />

        <Box
          sx={{
            gap: 2,
            width: 1,
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {/* Search TextField */}
          <TextField
            fullWidth
            value={currentFilters.name}
            onChange={handleFilterName}
            placeholder="Search..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />

          {/* Sort Toggle */}
          <IconButton
            onClick={handleToggleSortOrder}
            title={`Sort by date: ${currentFilters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
          >
            <Iconify
              icon={
                currentFilters.sortOrder === 'asc'
                  ? 'eva:arrow-upward-fill'
                  : 'eva:arrow-downward-fill'
              }
            />
          </IconButton>
        </Box>
      </Box>

      {canReset && (
        <ExpenseTableFiltersResult
          filters={filters}
          totalResults={dataFiltered?.length || 0}
          onResetPage={onResetPage}
          sx={{ p: 2.5, pt: 0 }}
        />
      )}
    </>
  );
}
