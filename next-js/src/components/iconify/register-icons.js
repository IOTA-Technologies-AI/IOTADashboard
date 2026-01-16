import { addCollection } from '@iconify/react';

import allIcons from './icon-sets';

// ----------------------------------------------------------------------

export const iconSets = Object.entries(allIcons).reduce((acc, [key, value]) => {
  const [prefix, iconName] = key.split(':');
  const existingPrefix = acc.find((item) => item.prefix === prefix);

  if (existingPrefix) {
    existingPrefix.icons[iconName] = value;
  } else {
    acc.push({
      prefix,
      icons: {
        [iconName]: value,
      },
    });
  }

  return acc;
}, []);

export const allIconNames = Object.keys(allIcons);

// ----------------------------------------------------------------------

let areIconsRegistered = false;

export function registerIcons() {
  if (areIconsRegistered) {
    return;
  }

  iconSets.forEach((iconSet) => {
    // Handle different icon set dimensions
    let width = 24;
    let height = 24;

    if (iconSet.prefix === 'carbon') {
      width = 32;
      height = 32;
    } else if (iconSet.prefix === 'logos') {
      width = 256;
      height = 256;
    }

    // Check if individual icons have custom dimensions
    const icons = {};
    Object.entries(iconSet.icons).forEach(([name, icon]) => {
      icons[name] = {
        body: icon.body,
        ...(icon.width && { width: icon.width }),
        ...(icon.height && { height: icon.height }),
      };
    });

    const iconSetConfig = {
      prefix: iconSet.prefix,
      icons,
      width,
      height,
    };

    addCollection(iconSetConfig);
  });

  areIconsRegistered = true;
}
