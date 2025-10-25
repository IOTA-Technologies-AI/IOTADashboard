import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';

import { Field } from 'src/components/hook-form';

// ----------------------------------------------------------------------

const STATUS_OPTIONS = ['paid', 'pending', 'approved', 'overdue', 'draft'];

// ----------------------------------------------------------------------

export function InvoiceCreateEditStatusDate() {
  return (
    <Stack
      spacing={2}
      direction={{ xs: 'column', sm: 'row' }}
      sx={{ p: 3, bgcolor: 'background.neutral' }}
    >
      <Field.DatePicker name="createDate" label="Date create" />

      <Field.DatePicker name="dueDate" label="Due date" />

      <Field.Select fullWidth name="status" label="Status" InputLabelProps={{ shrink: true }}>
        {STATUS_OPTIONS.map((option) => (
          <MenuItem key={option} value={option} sx={{ textTransform: 'capitalize' }}>
            {option}
          </MenuItem>
        ))}
      </Field.Select>
    </Stack>
  );
}
