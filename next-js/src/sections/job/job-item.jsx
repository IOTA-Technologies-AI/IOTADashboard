import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';

import { RouterLink } from 'src/routes/components';

import { fDate } from 'src/utils/format-time';
import { fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';
import { CustomPopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

const STATUS_CONFIG = {
  published: { label: 'Published', color: 'success' },
  pending_approval: { label: 'Pending Approval', color: 'warning' },
  draft: { label: 'Draft', color: 'default' },
  rejected: { label: 'Rejected', color: 'error' },
};

export function JobItem({
  job,
  editHref,
  detailsHref,
  onDelete,
  onApprove,
  onReject,
  isAdmin,
  sx,
  ...other
}) {
  const menuActions = usePopover();

  const statusConfig = STATUS_CONFIG[job.status] || STATUS_CONFIG.draft;

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        <li>
          <MenuItem component={RouterLink} href={detailsHref} onClick={() => menuActions.onClose()}>
            <Iconify icon="solar:eye-bold" />
            View
          </MenuItem>
        </li>

        <li>
          <MenuItem component={RouterLink} href={editHref} onClick={() => menuActions.onClose()}>
            <Iconify icon="solar:pen-bold" />
            Edit
          </MenuItem>
        </li>

        {/* Admin approval actions - only show for pending jobs */}
        {isAdmin && job.status === 'pending_approval' && (
          <>
            <MenuItem
              onClick={() => {
                menuActions.onClose();
                onApprove();
              }}
              sx={{ color: 'success.main' }}
            >
              <Iconify icon="mdi:check-circle" />
              Approve & Publish
            </MenuItem>

            <MenuItem
              onClick={() => {
                menuActions.onClose();
                onReject();
              }}
              sx={{ color: 'warning.main' }}
            >
              <Iconify icon="mdi:close-circle" />
              Reject
            </MenuItem>
          </>
        )}

        <MenuItem
          onClick={() => {
            menuActions.onClose();
            onDelete();
          }}
          sx={{ color: 'error.main' }}
        >
          <Iconify icon="solar:trash-bin-trash-bold" />
          Delete
        </MenuItem>
      </MenuList>
    </CustomPopover>
  );

  return (
    <>
      <Card sx={sx} {...other}>
        {/* Status Badge */}
        <Label
          color={statusConfig.color}
          sx={{ position: 'absolute', top: 8, left: 8, textTransform: 'capitalize' }}
        >
          {statusConfig.label}
        </Label>

        <IconButton onClick={menuActions.onOpen} sx={{ position: 'absolute', top: 8, right: 8 }}>
          <Iconify icon="eva:more-vertical-fill" />
        </IconButton>

        <Box sx={{ p: 3, pb: 2 }}>
          <Avatar
            alt={job.company.name}
            src={job.company.logo}
            variant="rounded"
            sx={{ width: 48, height: 48, mb: 2 }}
          />

          <ListItemText
            sx={{ mb: 1 }}
            primary={
              <Link component={RouterLink} href={detailsHref} color="inherit">
                {job.title}
              </Link>
            }
            secondary={`Posted date: ${fDate(job.createdAt)}`}
            slotProps={{
              primary: { sx: { typography: 'subtitle1' } },
              secondary: {
                sx: { mt: 1, typography: 'caption', color: 'text.disabled' },
              },
            }}
          />

          <Box
            sx={{
              gap: 0.5,
              display: 'flex',
              alignItems: 'center',
              color: 'primary.main',
              typography: 'caption',
            }}
          >
            <Iconify width={16} icon="solar:users-group-rounded-bold" />
            {job.candidates.length} candidates
          </Box>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Box
          sx={{
            p: 3,
            rowGap: 1.5,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
          }}
        >
          {[
            {
              label: job.experience,
              icon: <Iconify width={16} icon="carbon:skill-level-basic" sx={{ flexShrink: 0 }} />,
            },
            {
              label: job.employmentTypes.join(', '),
              icon: <Iconify width={16} icon="solar:clock-circle-bold" sx={{ flexShrink: 0 }} />,
            },
            {
              label: job.salary.negotiable ? 'Negotiable' : fCurrency(job.salary.price),
              icon: <Iconify width={16} icon="solar:wad-of-money-bold" sx={{ flexShrink: 0 }} />,
            },
            {
              label: job.role,
              icon: <Iconify width={16} icon="solar:user-rounded-bold" sx={{ flexShrink: 0 }} />,
            },
          ].map((item) => (
            <Box
              key={item.label}
              sx={{
                gap: 0.5,
                minWidth: 0,
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                color: 'text.disabled',
              }}
            >
              {item.icon}
              <Typography variant="caption" noWrap>
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Card>

      {renderMenuActions()}
    </>
  );
}
