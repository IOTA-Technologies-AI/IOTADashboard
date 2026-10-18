'use client';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * Where an NDA's actions live, replacing the floating panel that sat over the
 * page (Deel / Contractbook pattern, see Mobbin):
 *
 *  - NdaHeaderActions: in the page title row — the one action this stage
 *    needs, Print, and a ⋯ menu for everything occasional.
 *  - NdaNextStepBanner: above the content — what the NDA is waiting for, why
 *    an action is blocked, and the same action again where it is read.
 *
 * An action is { label, icon, onClick, href, loading, disabled, tooltip, color }.
 * A step is { severity, title, detail, primary?: action, secondary?: action[] }.
 * Menu items are actions plus { divider?: true, danger?: true }.
 */

function ActionButton({ action, variant = 'contained', size = 'medium' }) {
  if (!action) return null;
  const button = (
    <LoadingButton
      variant={variant}
      size={size}
      color={action.color || 'primary'}
      loading={!!action.loading}
      disabled={!!action.disabled}
      startIcon={action.icon ? <Iconify icon={action.icon} /> : null}
      onClick={action.onClick}
      {...(action.href ? { href: action.href, target: '_blank', rel: 'noopener' } : {})}
    >
      {action.label}
    </LoadingButton>
  );
  if (!action.tooltip) return button;
  // A disabled button fires no events, so the tooltip needs a wrapper.
  return (
    <Tooltip title={action.tooltip}>
      <span>{button}</span>
    </Tooltip>
  );
}

export function NdaHeaderActions({ primary, onPrint, menuItems = [] }) {
  const [anchor, setAnchor] = useState(null);
  const items = menuItems.filter(Boolean);
  const close = () => setAnchor(null);

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Button
        variant="outlined"
        startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
        onClick={onPrint}
      >
        Print
      </Button>
      <ActionButton action={primary} />
      {items.length > 0 && (
        <>
          <Tooltip title="More actions">
            <IconButton
              aria-label="More actions"
              aria-haspopup="menu"
              onClick={(e) => setAnchor(e.currentTarget)}
              sx={{ border: (theme) => `1px solid ${theme.vars.palette.divider}`, borderRadius: 1 }}
            >
              <Iconify icon="eva:more-horizontal-fill" />
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchor}
            open={!!anchor}
            onClose={close}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{ paper: { sx: { minWidth: 220 } } }}
          >
            {items.map((item) =>
              item.divider ? (
                <Divider key={item.key} />
              ) : (
                <MenuItem
                  key={item.key || item.label}
                  disabled={!!item.disabled}
                  onClick={() => {
                    close();
                    item.onClick?.();
                  }}
                  sx={item.danger ? { color: 'error.main' } : undefined}
                >
                  {item.icon ? (
                    <ListItemIcon sx={item.danger ? { color: 'error.main' } : undefined}>
                      <Iconify icon={item.icon} width={18} />
                    </ListItemIcon>
                  ) : null}
                  <ListItemText
                    primary={item.label}
                    secondary={item.disabled ? item.tooltip : null}
                    secondaryTypographyProps={{ variant: 'caption', noWrap: false }}
                  />
                </MenuItem>
              )
            )}
          </Menu>
        </>
      )}
    </Stack>
  );
}

const TONE_ICON = {
  warning: 'solar:danger-triangle-bold',
  error: 'solar:danger-triangle-bold',
  info: 'solar:info-circle-bold',
  success: 'solar:check-circle-bold',
};

/**
 * Deel's contract banner: a soft tinted card, a coloured title with an icon,
 * plain body text, and the actions underneath — secondary outlined, the one
 * that moves the NDA on in solid dark.
 */
export function NdaNextStepBanner({ step }) {
  if (!step) return null;
  const tone = step.severity || 'info';
  const secondary = (step.secondary || []).filter(Boolean);

  return (
    <Box
      role="status"
      sx={(theme) => ({
        mb: 3,
        px: 2.5,
        py: 2,
        borderRadius: 1.5,
        border: `1px solid ${varAlpha(theme.vars.palette[tone].mainChannel, 0.32)}`,
        bgcolor: varAlpha(theme.vars.palette[tone].mainChannel, 0.08),
      })}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Iconify
          icon={TONE_ICON[tone] || TONE_ICON.info}
          width={18}
          sx={(theme) => ({
            color: theme.vars.palette[tone].dark,
            ...theme.applyStyles('dark', { color: theme.vars.palette[tone].light }),
          })}
        />
        <Typography
          variant="subtitle2"
          sx={(theme) => ({
            color: theme.vars.palette[tone].dark,
            ...theme.applyStyles('dark', { color: theme.vars.palette[tone].light }),
          })}
        >
          {step.title}
        </Typography>
      </Stack>
      {step.detail ? (
        <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary' }}>
          {step.detail}
        </Typography>
      ) : null}
      {(step.primary || secondary.length > 0) && (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1.75 }}>
          {secondary.map((a) => (
            <ActionButton
              key={a.label}
              action={{ ...a, color: 'inherit' }}
              size="small"
              variant="outlined"
            />
          ))}
          {step.primary ? (
            <ActionButton
              action={{ ...step.primary, color: step.primary.color || 'inherit' }}
              size="small"
              variant="contained"
            />
          ) : null}
        </Stack>
      )}
    </Box>
  );
}
