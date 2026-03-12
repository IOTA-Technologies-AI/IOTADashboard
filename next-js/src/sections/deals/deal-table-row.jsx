import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';

export function DealTableRow({ row, selected, onSelectRow, onViewRow, onEditRow, onDeleteRow }) {
  const confirm = useBoolean();
  const popover = usePopover();

  const currencyCode = getCurrencyCodeFromRegion(row.region || row.country);
  const formatAmount = (value) => fCurrency(value || 0, { currencyCode });

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      active: 'info',
      completed: 'success',
      partially_paid: 'warning',
      cancelled: 'error',
    };
    return colors[status] || 'default';
  };

  const getBdmPaidAmount = () => {
    if (
      typeof row.bdmCommissionPaidAmount === 'number' &&
      !Number.isNaN(row.bdmCommissionPaidAmount)
    ) {
      return Math.max(row.bdmCommissionPaidAmount, 0);
    }
    return row.bdmCommissionPaid ? row.bdmCommissionAmount || 0 : 0;
  };

  const bdmTotal = row.bdmCommissionAmount || 0;
  const bdmPaid = Math.min(getBdmPaidAmount(), bdmTotal);
  const bdmPending = Math.max(bdmTotal - bdmPaid, 0);
  const bdmPaymentDate = row.bdmPaymentDate ? fDate(row.bdmPaymentDate) : '-';

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            onClick={onSelectRow}
            inputProps={{ id: `row-checkbox-${row.id}`, 'aria-label': `Row checkbox` }}
          />
        </TableCell>

        <TableCell>
          <Link
            color="inherit"
            onClick={onViewRow}
            sx={{ cursor: 'pointer', fontWeight: 'fontWeightMedium' }}
          >
            {row.dealNumber}
          </Link>
        </TableCell>

        <TableCell>{row.dealName}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDate(row.dealDate)}</TableCell>

        <TableCell
          sx={{ color: 'info.main', fontWeight: 'fontWeightMedium', whiteSpace: 'nowrap' }}
        >
          {formatAmount(row.arInvoiceAmount)}
        </TableCell>

        <TableCell
          sx={{ color: 'error.main', fontWeight: 'fontWeightMedium', whiteSpace: 'nowrap' }}
        >
          {formatAmount(row.apInvoiceAmount)}
        </TableCell>

        <TableCell
          sx={{ color: 'success.main', fontWeight: 'fontWeightBold', whiteSpace: 'nowrap' }}
        >
          {formatAmount(row.grossProfit)}
        </TableCell>

        <TableCell sx={{ color: 'warning.main', whiteSpace: 'nowrap' }}>
          {formatAmount(row.bdmCommissionAmount)}
        </TableCell>
        <TableCell sx={{ color: 'success.main', whiteSpace: 'nowrap' }}>
          {bdmPaid > 0 ? formatAmount(bdmPaid) : '-'}
        </TableCell>

        <TableCell sx={{ color: 'warning.dark', whiteSpace: 'nowrap' }}>
          {bdmPending > 0 ? formatAmount(bdmPending) : '-'}
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{bdmPaymentDate}</TableCell>

        <TableCell
          sx={{ color: 'primary.main', fontWeight: 'fontWeightBold', whiteSpace: 'nowrap' }}
        >
          {formatAmount(row.netProfitAfterBDM)}
        </TableCell>

        <TableCell>
          <Label variant="soft" color={getStatusColor(row.status)}>
            {row.status}
          </Label>
        </TableCell>

        <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
          <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      <CustomPopover
        open={popover.open}
        anchorEl={popover.anchorEl}
        onClose={popover.onClose}
        slotProps={{ arrow: { placement: 'right-top' } }}
      >
        <MenuList>
          <MenuItem
            onClick={() => {
              onViewRow();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:eye-bold" />
            View
          </MenuItem>

          <MenuItem
            onClick={() => {
              onEditRow();
              popover.onClose();
            }}
          >
            <Iconify icon="solar:pen-bold" />
            Edit
          </MenuItem>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <MenuItem
            onClick={() => {
              confirm.onTrue();
              popover.onClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
            Delete
          </MenuItem>
        </MenuList>
      </CustomPopover>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content="Are you sure want to delete this deal?"
        action={
          <Button variant="contained" color="error" onClick={onDeleteRow}>
            Delete
          </Button>
        }
      />
    </>
  );
}

function getCurrencyCodeFromRegion(region) {
  const value = (region || '').toString().toLowerCase();

  if (value.includes('uae') || value === 'ae' || value.includes('united arab emirates')) {
    return 'AED';
  }

  if (value.includes('ksa') || value.includes('saudi') || value === 'sa') {
    return 'SAR';
  }

  return 'USD';
}
