import { Iconify } from 'src/components/iconify';
import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

export const _account = [
  {
    label: 'Home',
    href: paths.dashboard.root,
    icon: <Iconify icon="solar:home-angle-bold-duotone" />,
  },
  {
    label: 'Profile',
    href: paths.dashboard.user.root,
    icon: <Iconify icon="custom:profile-duotone" />,
  },
  {
    label: 'Settings',
    href: paths.dashboard.user.account,
    icon: <Iconify icon="solar:settings-bold-duotone" />,
  },
];
