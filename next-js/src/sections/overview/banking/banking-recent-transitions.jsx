import { useState } from 'react';
import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import CardHeader from '@mui/material/CardHeader';
import ListItemText from '@mui/material/ListItemText';
import Badge, { badgeClasses } from '@mui/material/Badge';

import { fCurrency } from 'src/utils/format-number';
import { fDate, fTime } from 'src/utils/format-time';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { TableHeadCustom } from 'src/components/table';
import { CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

export function BankingRecentTransitions({ sx, title, subheader, tableData, headCells, ...other }) {
  const [currentTab, setCurrentTab] = useState('UAE');

  // Filter transactions by region
  const filteredData = tableData.filter((txn) => txn.region === currentTab);

  // Limit to 10 most recent transactions
  const displayData = filteredData.slice(0, 10);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
  };

  return (
    <Card sx={sx} {...other}>
      <CardHeader title={title} subheader={subheader} sx={{ mb: 2 }} />

      {/* Region Tabs */}
      <Box sx={{ px: 3, pb: 2 }}>
        <Tabs value={currentTab} onChange={handleTabChange} variant="fullWidth">
          <Tab value="UAE" label="UAE" />
          <Tab value="KSA" label="KSA" />
        </Tabs>
      </Box>

      <Scrollbar sx={{ minHeight: 462 }}>
        <Table sx={{ minWidth: 720 }}>
          <TableHeadCustom headCells={headCells} />

          <TableBody>
            {displayData.length > 0 ? (
              displayData.map((row) => <RowItem key={row.id} row={row} />)
            ) : (
              <TableRow>
                <TableCell colSpan={headCells.length} align="center" sx={{ py: 5 }}>
                  <Box sx={{ color: 'text.secondary' }}>
                    No transactions found for {currentTab}
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Scrollbar>

      <Divider sx={{ borderStyle: 'dashed' }} />

      <Box sx={{ p: 2, textAlign: 'right' }}>
        <Button
          size="small"
          color="inherit"
          endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={18} sx={{ ml: -0.5 }} />}
        >
          View all
        </Button>
      </Box>
    </Card>
  );
}

// ----------------------------------------------------------------------

function RowItem({ row }) {
  const menuActions = usePopover();

  const handleDownload = () => {
    menuActions.onClose();
    console.info('DOWNLOAD', row.id);
  };

  const handlePrint = () => {
    menuActions.onClose();
    console.info('PRINT', row.id);
  };

  const handleShare = () => {
    menuActions.onClose();
    console.info('SHARE', row.id);
  };

  const handleDelete = () => {
    menuActions.onClose();
    console.info('DELETE', row.id);
  };

  const renderAvatar = () => (
    <Box sx={{ position: 'relative' }}>
      <Badge
        overlap="circular"
        color={row.type === 'Income' ? 'success' : 'error'}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        badgeContent={
          <Iconify
            icon={
              row.type === 'Income'
                ? 'eva:diagonal-arrow-left-down-fill'
                : 'eva:diagonal-arrow-right-up-fill'
            }
            width={16}
          />
        }
        sx={{ [`& .${badgeClasses.badge}`]: { p: 0, width: 20 } }}
      >
        <Avatar
          src={row.avatarUrl || ''}
          sx={{
            width: 48,
            height: 48,
            color: 'text.secondary',
            bgcolor: 'background.neutral',
          }}
        >
          {row.category === 'Fast food' && <Iconify icon="custom:fast-food-fill" width={24} />}
          {row.category === 'Fitness' && (
            <Iconify icon="solar:dumbbell-large-minimalistic-bold" width={24} />
          )}
        </Avatar>
      </Badge>
    </Box>
  );

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        <MenuItem onClick={handleDownload}>
          <Iconify icon="eva:cloud-download-fill" />
          Download
        </MenuItem>

        <MenuItem onClick={handlePrint}>
          <Iconify icon="solar:printer-minimalistic-bold" />
          Print
        </MenuItem>

        <MenuItem onClick={handleShare}>
          <Iconify icon="solar:share-bold" />
          Share
        </MenuItem>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <Iconify icon="solar:trash-bin-trash-bold" />
          Delete
        </MenuItem>
      </MenuList>
    </CustomPopover>
  );

  return (
    <>
      <TableRow>
        <TableCell>
          <Box sx={{ gap: 2, display: 'flex', alignItems: 'center' }}>
            {renderAvatar()}
            <ListItemText primary={row.message} secondary={row.category} />
          </Box>
        </TableCell>

        <TableCell>
          <ListItemText
            primary={fDate(row.date)}
            secondary={fTime(row.date)}
            slotProps={{
              primary: { sx: { typography: 'body2' } },
              secondary: {
                sx: { mt: 0.5, typography: 'caption' },
              },
            }}
          />
        </TableCell>

        <TableCell>
          {fCurrency(Math.abs(row.amount), {
            currencyCode: row.currency || (row.region === 'KSA' ? 'SAR' : 'AED'),
          })}
        </TableCell>

        <TableCell>
          <Label variant="soft" color="success" sx={{ textTransform: 'capitalize' }}>
            Posted
          </Label>
        </TableCell>

        <TableCell align="right" sx={{ pr: 1 }}>
          <IconButton color={menuActions.open ? 'inherit' : 'default'} onClick={menuActions.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </TableRow>

      {renderMenuActions()}
    </>
  );
}
