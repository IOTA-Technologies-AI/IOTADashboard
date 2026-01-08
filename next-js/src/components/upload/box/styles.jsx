import { varAlpha } from 'minimal-shared/utils';

import { styled } from '@mui/material/styles';

import { uploadClasses } from '../classes';

// ----------------------------------------------------------------------

export const UploadArea = styled('div')(({ theme }) => ({
  width: '100%',
  minHeight: 180,
  padding: theme.spacing(2),
  display: 'flex',
  cursor: 'pointer',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: theme.spacing(1),
  borderRadius: theme.shape.borderRadius * 1.5,
  color: theme.vars.palette.text.secondary,
  background: `linear-gradient(135deg, ${varAlpha(theme.vars.palette.primary.mainChannel, 0.04)}, ${varAlpha(theme.vars.palette.grey['500Channel'], 0.04)})`,
  border: `dashed 1px ${varAlpha(theme.vars.palette.grey['500Channel'], 0.24)}`,
  transition: theme.transitions.create(['border-color', 'box-shadow', 'transform'], {
    duration: theme.transitions.duration.shorter,
  }),
  '&:hover': {
    borderColor: theme.vars.palette.primary.main,
    boxShadow: theme.vars.customShadows.z8,
    transform: 'translateY(-2px)',
  },
  [`&.${uploadClasses.state.dragActive}`]: {
    opacity: 0.72,
  },
  [`&.${uploadClasses.state.disabled}`]: {
    opacity: 0.48,
    pointerEvents: 'none',
  },
  [`&.${uploadClasses.state.error}`]: {
    color: theme.vars.palette.error.main,
    borderColor: theme.vars.palette.error.main,
    backgroundColor: varAlpha(theme.vars.palette.error.mainChannel, 0.08),
  },
}));
