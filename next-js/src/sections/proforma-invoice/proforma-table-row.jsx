import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Avatar from '@mui/material/Avatar';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';

import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

const STATUS_COLOR = {
  draft: 'default',
  pending: 'warning',
  approved: 'info',
  dispatched: 'success',
  rejected: 'error',
};

export function ProformaTableRow({ row, detailsHref, canApprove = false, onOpenApproval }) {
  const menuActions = usePopover();

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

        {canApprove && (row.status === 'draft' || row.status === 'pending') && (
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

        <li>
          <MenuItem
            onClick={() => {
              window.open(`/proforma-print/${row.id}`, '_blank');
              menuActions.onClose();
            }}
          >
            <Iconify icon="solar:printer-minimalistic-bold" />
            Print
          </MenuItem>
        </li>
      </MenuList>
    </CustomPopover>
  );

  return (
    <>
      <TableRow hover tabIndex={-1}>
        <TableCell>
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            <Avatar alt={row.customerName}>{(row.customerName || '?').charAt(0)}</Avatar>
            <ListItemText
              primary={row.customerName || 'Unknown customer'}
              secondary={
                <Link component={RouterLink} href={detailsHref} color="inherit" underline="always">
                  {row.proformaNumber}
                </Link>
              }
              slotProps={{
                primary: { noWrap: true, sx: { typography: 'body2' } },
                secondary: { sx: { color: 'text.disabled' } },
              }}
            />
          </Box>
        </TableCell>

        <TableCell>
          <ListItemText
            primary={row.invoiceNumber || '—'}
            slotProps={{ primary: { noWrap: true, sx: { typography: 'body2' } } }}
          />
        </TableCell>

        <TableCell>
          <ListItemText
            primary={fDate(row.issueDate)}
            slotProps={{ primary: { noWrap: true, sx: { typography: 'body2' } } }}
          />
        </TableCell>

        {/* An unset supplier is the one thing that blocks dispatch, so it is
            called out rather than shown as an empty cell. */}
        <TableCell>
          {row.supplierName ? (
            <ListItemText
              primary={row.supplierName}
              slotProps={{ primary: { noWrap: true, sx: { typography: 'body2' } } }}
            />
          ) : (
            <Label variant="soft" color="warning">
              Not tagged
            </Label>
          )}
        </TableCell>

        <TableCell>{fCurrency(row.total, { currencyCode: row.currencyCode })}</TableCell>

        <TableCell>
          <Label variant="soft" color={STATUS_COLOR[row.status] || 'default'}>
            {row.status}
          </Label>
        </TableCell>

        <TableCell align="right" sx={{ px: 1 }}>
          <IconButton
            color={menuActions.open ? 'inherit' : 'default'}
            onClick={menuActions.onOpen}
            aria-label="More actions"
          >
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      {renderMenuActions()}
    </>
  );
}
