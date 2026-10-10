'use client';

import { m } from 'framer-motion';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Badge from '@mui/material/Badge';
import Stack from '@mui/material/Stack';
import Drawer from '@mui/material/Drawer';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { RouterLink } from 'src/routes/components';

import { fToNow } from 'src/utils/format-time';

import { useMyActions } from 'src/actions/dashboard';

import { Iconify } from 'src/components/iconify';
import { Scrollbar } from 'src/components/scrollbar';
import { varTap, varHover, transitionTap } from 'src/components/animate';

import { ACTION_ICON } from 'src/sections/overview/app/dashboard-actions';

// ----------------------------------------------------------------------

/**
 * The bell: what is waiting for the signed-in user — NDAs and offers to sign,
 * offers to approve, NDA exceptions and vetting decisions. An item disappears
 * once it has been dealt with, so there is nothing to mark as read.
 */
export function NotificationsDrawer({ sx, ...other }) {
  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();
  const { actions, loading, refresh } = useMyActions();

  return (
    <>
      <IconButton
        component={m.button}
        whileTap={varTap(0.96)}
        whileHover={varHover(1.04)}
        transition={transitionTap()}
        aria-label="Waiting for you"
        onClick={() => {
          refresh();
          onOpen();
        }}
        sx={sx}
        {...other}
      >
        <Badge badgeContent={actions.length} color="error">
          <Iconify width={24} icon="solar:bell-bing-bold-duotone" />
        </Badge>
      </IconButton>

      <Drawer
        open={open}
        onClose={onClose}
        anchor="right"
        slotProps={{
          backdrop: { invisible: true },
          paper: { sx: { width: 1, maxWidth: 420 } },
        }}
      >
        <Stack direction="row" alignItems="center" sx={{ py: 2, pl: 2.5, pr: 1, minHeight: 68 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Waiting for you
          </Typography>
          <IconButton onClick={onClose}>
            <Iconify icon="mingcute:close-line" />
          </IconButton>
        </Stack>

        <Scrollbar>
          {!loading && !actions.length ? (
            <Typography variant="body2" color="text.secondary" sx={{ px: 2.5, py: 3 }}>
              Nothing needs your signature or decision right now.
            </Typography>
          ) : null}
          <Box component="ul" sx={{ p: 0, m: 0 }}>
            {actions.map((a) => (
              <Box component="li" key={`${a.kind}-${a.href}`} sx={{ listStyle: 'none' }}>
                <Stack
                  component={RouterLink}
                  href={a.href}
                  onClick={onClose}
                  direction="row"
                  spacing={2}
                  sx={{
                    px: 2.5,
                    py: 1.75,
                    color: 'inherit',
                    textDecoration: 'none',
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <Iconify
                    icon={ACTION_ICON[a.kind] || 'solar:bell-bing-bold'}
                    sx={{ color: 'primary.main', mt: 0.25 }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2">{a.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {a.detail}
                    </Typography>
                    {a.since ? (
                      <Typography variant="caption" color="text.disabled">
                        {fToNow(a.since)}
                      </Typography>
                    ) : null}
                  </Box>
                </Stack>
              </Box>
            ))}
          </Box>
        </Scrollbar>
      </Drawer>
    </>
  );
}
