import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import ToggleButton from '@mui/material/ToggleButton';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const QUARTERS = [
  { value: 1, label: 'Q1 (Jan-Mar)' },
  { value: 2, label: 'Q2 (Apr-Jun)' },
  { value: 3, label: 'Q3 (Jul-Sep)' },
  { value: 4, label: 'Q4 (Oct-Dec)' },
];

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'AR', label: 'Accounts Receivable' },
  { value: 'AP', label: 'Accounts Payable' },
];

const CURRENCIES = ['All', 'SAR', 'AED', 'USD', 'EUR', 'GBP'];

// ----------------------------------------------------------------------

export function VATTableToolbar({ filters, onFiltersChange }) {
  const { year, quarter, month, periodType, type, currency, searchQuery } = filters;

  const handlePeriodTypeChange = useCallback(
    (event, newPeriodType) => {
      if (newPeriodType !== null) {
        onFiltersChange({ ...filters, periodType: newPeriodType });
      }
    },
    [filters, onFiltersChange]
  );

  // One handler for every select and text field — each call site passes the
  // filter key it owns, instead of six identical copies of the same callback.
  const handleFieldChange = useCallback(
    (field) => (event) => {
      onFiltersChange({ ...filters, [field]: event.target.value });
    },
    [filters, onFiltersChange]
  );

  return (
    <Box
      sx={{
        p: 2.5,
        gap: 2,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}
    >
      {/* Period Type Toggle */}
      <ToggleButtonGroup
        value={periodType || 'quarterly'}
        exclusive
        onChange={handlePeriodTypeChange}
        aria-label="period type"
        size="small"
      >
        <ToggleButton value="quarterly" aria-label="quarterly">
          <Iconify icon="solar:calendar-bold" sx={{ mr: 0.5 }} />
          Quarterly
        </ToggleButton>
        <ToggleButton value="monthly" aria-label="monthly">
          <Iconify icon="solar:calendar-date-bold" sx={{ mr: 0.5 }} />
          Monthly
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Year Filter */}
      <FormControl sx={{ minWidth: 120 }}>
        <InputLabel>Year</InputLabel>
        <Select value={year} onChange={handleFieldChange('year')} label="Year">
          {YEARS.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Quarter Filter - shown when periodType is quarterly */}
      {(periodType === 'quarterly' || !periodType) && (
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Quarter</InputLabel>
          <Select value={quarter} onChange={handleFieldChange('quarter')} label="Quarter">
            {QUARTERS.map((q) => (
              <MenuItem key={q.value} value={q.value}>
                {q.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Month Filter - shown when periodType is monthly */}
      {periodType === 'monthly' && (
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Month</InputLabel>
          <Select value={month || 1} onChange={handleFieldChange('month')} label="Month">
            {MONTHS.map((m) => (
              <MenuItem key={m.value} value={m.value}>
                {m.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {/* Type Filter */}
      <FormControl sx={{ minWidth: 180 }}>
        <InputLabel>Type</InputLabel>
        <Select value={type} onChange={handleFieldChange('type')} label="Type">
          {TYPES.map((t) => (
            <MenuItem key={t.value} value={t.value}>
              {t.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Currency Filter */}
      <FormControl sx={{ minWidth: 120 }}>
        <InputLabel>Currency</InputLabel>
        <Select value={currency} onChange={handleFieldChange('currency')} label="Currency">
          {CURRENCIES.map((c) => (
            <MenuItem key={c} value={c}>
              {c}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Search */}
      <TextField
        fullWidth
        value={searchQuery}
        onChange={handleFieldChange('searchQuery')}
        placeholder="Search invoice number or customer..."
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
        sx={{ maxWidth: 320 }}
      />
    </Box>
  );
}
