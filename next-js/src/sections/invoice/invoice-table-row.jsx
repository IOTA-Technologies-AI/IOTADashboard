import { useState } from 'react';
import { useBoolean, usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { RouterLink } from 'src/routes/components';

import { fCurrency } from 'src/utils/format-number';
import { fDate, fTime } from 'src/utils/format-time';
import { markInvoicePaid } from 'src/utils/apiHelper';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { CustomPopover } from 'src/components/custom-popover';
import { toast } from 'src/components/snackbar';

// ----------------------------------------------------------------------

export function InvoiceTableRow({
  row,
  selected,
  editHref,
  onSelectRow,
  onDeleteRow,
  detailsHref,
  canEdit = true,
  canDelete = false,
  canApprove = false,
  canMarkPaid = false,
  onOpenApproval,
  onMarkPaid,
}) {
  const menuActions = usePopover();
  const confirmDialog = useBoolean();
  const paidDialog = useBoolean();
  const [marking, setMarking] = useState(false);

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        <li>
          <MenuItem component={RouterLink} href={detailsHref} onClick={menuActions.onClose}>
            <Iconify icon="solar:eye-bold" />
            View
          </MenuItem>
        </li>

        {canApprove && row.status === 'pending' && (
          <li>
            <MenuItem
              onClick={() => {
                onOpenApproval?.(row);
                menuActions.onClose();
              }}
              sx={{ color: 'success.main' }}
            >
              <Iconify icon="solar:check-circle-bold" />
              Review &amp; Approve
            </MenuItem>
          </li>
        )}

        {canMarkPaid && row.status === 'approved' && (
          <li>
            <MenuItem
              onClick={() => {
                paidDialog.onTrue();
                menuActions.onClose();
              }}
              sx={{ color: 'success.dark' }}
            >
              <Iconify icon="solar:wallet-money-bold" />
              Mark as Paid
            </MenuItem>
          </li>
        )}

        {canEdit && (
          <li>
            <MenuItem component={RouterLink} href={editHref} onClick={menuActions.onClose}>
              <Iconify icon="solar:pen-bold" />
              Edit
            </MenuItem>
          </li>
        )}

        {canDelete && (
          <>
            <Divider sx={{ borderStyle: 'dashed' }} />

            <MenuItem
              onClick={() => {
                confirmDialog.onTrue();
                menuActions.onClose();
              }}
              sx={{ color: 'error.main' }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" />
              Delete
            </MenuItem>
          </>
        )}
      </MenuList>
    </CustomPopover>
  );

  const renderConfirmDialog = () => (
    <ConfirmDialog
      open={confirmDialog.value}
      onClose={confirmDialog.onFalse}
      title="Delete"
      content="Are you sure want to delete?"
      action={
        <Button variant="contained" color="error" onClick={onDeleteRow}>
          Delete
        </Button>
      }
    />
  );

  const handleMarkPaid = async () => {
    setMarking(true);
    try {
      await markInvoicePaid(row.invoiceId || row.id, {
        markedByName: row.approvedBy || 'Finance',
        markedByEmail: '',
      });
      toast.success('Invoice marked as paid!');
      paidDialog.onFalse();
      onMarkPaid?.();
    } catch {
      toast.error('Failed to mark invoice as paid.');
    } finally {
      setMarking(false);
    }
  };

  const renderPaidDialog = () => (
    <ConfirmDialog
      open={paidDialog.value}
      onClose={paidDialog.onFalse}
      title="Mark as Paid"
      content={
        <>
          Confirm that funds for invoice <strong>{row.invoiceNumber}</strong> have been received and
          this invoice should be marked as <strong>Paid</strong>?
        </>
      }
      action={
        <Button variant="contained" color="success" onClick={handleMarkPaid} disabled={marking}>
          {marking ? 'Processing…' : 'Confirm Paid'}
        </Button>
      }
    />
  );

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox
            checked={selected}
            disabled={!canDelete}
            onClick={canDelete ? onSelectRow : undefined}
            slotProps={{
              input: {
                id: `${row.id}-checkbox`,
                'aria-label': `${row.id} checkbox`,
              },
            }}
          />
        </TableCell>

        <TableCell>
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar alt={row.invoiceTo.name}>{row.invoiceTo.name?.charAt(0).toUpperCase()}</Avatar>

            <ListItemText
              primary={row.invoiceTo.name}
              secondary={
                <Link component={RouterLink} href={detailsHref} color="inherit">
                  {row.invoiceNumber}
                </Link>
              }
              slotProps={{
                primary: { noWrap: true, sx: { typography: 'body2' } },
                secondary: {
                  sx: { color: 'text.disabled', '&:hover': { color: 'text.secondary' } },
                },
              }}
            />
          </Box>
        </TableCell>

        <TableCell>
          <ListItemText
            primary={fDate(row.createDate)}
            secondary={fTime(row.createDate)}
            slotProps={{
              primary: { noWrap: true, sx: { typography: 'body2' } },
              secondary: { sx: { mt: 0.5, typography: 'caption' } },
            }}
          />
        </TableCell>

        <TableCell>
          <ListItemText
            primary={fDate(row.dueDate)}
            secondary={fTime(row.dueDate)}
            slotProps={{
              primary: { noWrap: true, sx: { typography: 'body2' } },
              secondary: { sx: { mt: 0.5, typography: 'caption' } },
            }}
          />
        </TableCell>

        <TableCell>{fCurrency(row.totalAmount, { currency: row.currencyCode || 'SAR' })}</TableCell>

        <TableCell align="center">{row.sent}</TableCell>

        <TableCell>
          <Label
            variant="soft"
            color={
              (row.status === 'paid' && 'success') ||
              (row.status === 'pending' && 'warning') ||
              (row.status === 'approved' && 'info') ||
              (row.status === 'rejected' && 'error') ||
              (row.status === 'overdue' && 'error') ||
              'default'
            }
          >
            {row.status}
          </Label>
        </TableCell>

        <TableCell align="right" sx={{ px: 1 }}>
          <IconButton color={menuActions.open ? 'inherit' : 'default'} onClick={menuActions.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      {renderMenuActions()}
      {renderConfirmDialog()}
      {renderPaidDialog()}
    </>
  );
}
