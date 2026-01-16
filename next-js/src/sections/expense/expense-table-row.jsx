'use client';

import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { fDate } from 'src/utils/format-time';
import { EXPENSE_TYPES } from 'src/utils/constants/enums';

// Add to imports at top of file (around line 1-10)
import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';

import { ExpenseApprovalDialog } from './expense-approval-dialog';

// ----------------------------------------------------------------------

export function ExpenseTableRow({
  row,
  selected,
  onEditRow,
  onViewRow,
  onSelectRow,
  onDeleteRow,
  onRefresh,
  canEdit = true,
}) {
  const confirm = useBoolean();
  const popover = usePopover();
  const approvalDialog = useBoolean();

  const renderPrimary = (
    <TableRow hover selected={selected}>
      <TableCell>
        <Link
          color="inherit"
          onClick={onViewRow}
          underline="always"
          sx={{ cursor: 'pointer', typography: 'body2', fontWeight: 600 }}
        >
          #{row.id}
        </Link>
      </TableCell>
      <TableCell>
        <Stack spacing={2} direction="row" alignItems="center">
          <div>
            <Box sx={{ typography: 'body2' }}>{fDate(row.expenseDate)}</Box>
            {row.externalTransactionId && (
              <Box
                component="span"
                sx={{ color: 'text.disabled', typography: 'caption', display: 'block' }}
              >
                ID: {row.externalTransactionId}
              </Box>
            )}
          </div>
        </Stack>
      </TableCell>

      <TableCell>
        <ListItemText
          primary={
            EXPENSE_TYPES.find((type) => type.id === row.expenseType)?.label ||
            `Type ${row.expenseType}`
          }
          primaryTypographyProps={{ typography: 'body2' }}
        />
      </TableCell>

      {/* Description */}
      <TableCell sx={{ maxWidth: 250 }}>
        <Tooltip title={row.expenseSettlementNotes || '-'} placement="top-start">
          <ListItemText
            primary={
              row.expenseSettlementNotes
                ? row.expenseSettlementNotes.length > 50
                  ? `${row.expenseSettlementNotes.substring(0, 50)}...`
                  : row.expenseSettlementNotes
                : '-'
            }
            primaryTypographyProps={{
              typography: 'body2',
              noWrap: true,
            }}
          />
        </Tooltip>
      </TableCell>

      <TableCell>
        <Box sx={{ typography: 'body2', fontWeight: 600 }}>
          SAR {row.expenseAmount?.toFixed(2) || '0.00'}
        </Box>
      </TableCell>

      <TableCell>
        <Label
          variant="soft"
          color={
            row.expenseApprovalStatus === true
              ? 'success'
              : row.expenseApprovalStatus === false
                ? 'error'
                : 'warning'
          }
        >
          {row.expenseApprovalStatus === true
            ? 'Approved'
            : row.expenseApprovalStatus === false
              ? 'Rejected'
              : 'Pending'}
        </Label>
      </TableCell>

      <TableCell align="right" sx={{ px: 1, whiteSpace: 'nowrap' }}>
        <Tooltip title="Quick Edit" placement="top" arrow>
          <IconButton color={popover.open ? 'inherit' : 'default'} onClick={popover.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );

  const isPending = row.expenseApprovalStatus === null || row.expenseApprovalStatus === undefined;

  return (
    <>
      {renderPrimary}

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

          {/* Approve/Review action for pending expenses */}
          {isPending && canEdit && (
            <MenuItem
              onClick={() => {
                approvalDialog.onTrue();
                popover.onClose();
              }}
              sx={{ color: 'success.main' }}
            >
              <Iconify icon="solar:check-circle-bold" />
              Approve / Reject
            </MenuItem>
          )}

          {canEdit && (
            <MenuItem
              onClick={() => {
                onEditRow();
                popover.onClose();
              }}
            >
              <Iconify icon="solar:pen-bold" />
              Edit
            </MenuItem>
          )}
        </MenuList>
      </CustomPopover>

      {/* Expense Approval Dialog */}
      <ExpenseApprovalDialog
        open={approvalDialog.value}
        onClose={approvalDialog.onFalse}
        expense={row}
        onApprovalComplete={onRefresh}
      />

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content="Are you sure want to delete?"
        action={
          <Button variant="contained" color="error" onClick={onDeleteRow}>
            Delete
          </Button>
        }
      />
    </>
  );
}
