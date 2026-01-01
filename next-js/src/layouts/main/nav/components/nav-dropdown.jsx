import Fade from '@mui/material/Fade';
import { styled } from '@mui/material/styles';

// ----------------------------------------------------------------------

const NavDropdownPaper = styled('div')(({ theme }) => ({
  ...theme.mixins.paperStyles(theme, { dropdown: true }),
  padding: theme.spacing(5, 1, 1, 4),
  borderRadius: Number(theme.shape.borderRadius) * 2,
  ...(theme.direction === 'rtl' && {
    padding: theme.spacing(5, 4, 1, 1),
  }),
}));

// ----------------------------------------------------------------------

export const NavDropdown = styled(({ open, children, ...other }) => (
  <Fade in={open}>
    <div {...other}>
      <NavDropdownPaper>{children}</NavDropdownPaper>
    </div>
  </Fade>
))(({ theme }) => ({
  left: 0,
  top: 'calc(100% + 12px)',
  width: 'fit-content',
  minWidth: 220,
  position: 'absolute',
  padding: theme.spacing(1.5),
  zIndex: theme.zIndex.drawer * 2,
  maxWidth: 480,
}));
