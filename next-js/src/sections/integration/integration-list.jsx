'use client';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import CardContent from '@mui/material/CardContent';

import { fDateTime } from 'src/utils/format-time';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export function IntegrationList({ integrations, onEdit, onRefresh }) {
  return (
    <Box
      sx={{
        gap: 3,
        display: 'grid',
        gridTemplateColumns: {
          xs: 'repeat(1, 1fr)',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(3, 1fr)',
          lg: 'repeat(4, 1fr)',
        },
      }}
    >
      {integrations.map((integration) => (
        <IntegrationCard
          key={`${integration.name}-${integration.type}`}
          integration={integration}
          onEdit={onEdit}
        />
      ))}
    </Box>
  );
}

// ----------------------------------------------------------------------

function IntegrationCard({ integration, onEdit }) {
  const {
    displayName,
    description,
    icon,
    color,
    isConfigured,
    isActive,
    isVerified,
    lastSyncAt,
    lastError,
    docsUrl,
    comingSoon,
  } = integration;

  const getStatusColor = () => {
    if (comingSoon) return 'default';
    if (lastError) return 'error';
    if (isActive && isVerified) return 'success';
    if (isConfigured) return 'warning';
    return 'default';
  };

  const getStatusLabel = () => {
    if (comingSoon) return 'Coming Soon';
    if (lastError) return 'Error';
    if (isActive && isVerified) return 'Active';
    if (isConfigured) return 'Configured';
    return 'Not Configured';
  };

  return (
    <Card
      sx={{
        position: 'relative',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: (theme) => theme.shadows[8],
        },
        opacity: comingSoon ? 0.7 : 1,
      }}
    >
      {/* Status Badge */}
      <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
        <Chip
          size="small"
          label={getStatusLabel()}
          color={getStatusColor()}
          variant={isConfigured ? 'filled' : 'outlined'}
        />
      </Box>

      <CardContent sx={{ pt: 4 }}>
        {/* Icon and Title */}
        <Stack spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: `${color}15`,
            }}
          >
            <Iconify icon={icon} width={36} sx={{ color }} />
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              {displayName}
            </Typography>
            <Chip
              size="small"
              label={integration.type?.toUpperCase()}
              variant="outlined"
              sx={{ fontSize: '0.65rem', height: 20 }}
            />
          </Box>
        </Stack>

        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            minHeight: 40,
            textAlign: 'center',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {description}
        </Typography>

        {/* Last Sync Info */}
        {lastSyncAt && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', textAlign: 'center', mb: 2 }}
          >
            Last sync: {fDateTime(lastSyncAt)}
          </Typography>
        )}

        {/* Error Message */}
        {lastError && (
          <Tooltip title={lastError}>
            <Typography
              variant="caption"
              color="error.main"
              sx={{
                display: 'block',
                textAlign: 'center',
                mb: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              ⚠️ {lastError}
            </Typography>
          </Tooltip>
        )}

        {/* Actions */}
        <Stack direction="row" spacing={1} justifyContent="center">
          {!comingSoon && (
            <Button
              variant={isConfigured ? 'outlined' : 'contained'}
              size="small"
              onClick={() => onEdit(integration)}
              startIcon={<Iconify icon={isConfigured ? 'solar:pen-bold' : 'mingcute:add-line'} />}
            >
              {isConfigured ? 'Edit' : 'Configure'}
            </Button>
          )}

          {docsUrl && (
            <Tooltip title="View Documentation">
              <IconButton
                size="small"
                component="a"
                href={docsUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Iconify icon="solar:document-text-bold" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}
