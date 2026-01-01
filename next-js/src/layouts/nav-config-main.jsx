import { paths } from 'src/routes/paths';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const navData = [
  {
    title: 'IOTA',
    path: '/',
    icon: <Iconify width={22} icon="solar:home-angle-bold-duotone" />,
    children: [
      {
        subheader: 'IOTA',
        items: [
          { title: 'Brand Guidelines', path: '/brand-guidelines' },
          { title: 'Visit Us', path: '#' },
        ],
      },
    ],
  },
];
