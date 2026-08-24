import { themeConfig } from 'src/theme/theme-config';

// ----------------------------------------------------------------------

export const SETTINGS_STORAGE_KEY = 'app-settings';

/**
 * Cache-busting key for the stored settings object — NOT the app release
 * version. settings-provider resets a visitor's saved theme and layout
 * whenever this changes, so bump it only when the shape of defaultSettings
 * changes. Tying it to the release version would wipe everyone's preferences
 * on every deploy.
 */
export const SETTINGS_SCHEMA_VERSION = '9.9';

export const defaultSettings = {
  mode: themeConfig.defaultMode,
  direction: themeConfig.direction,
  contrast: 'default',
  navLayout: 'vertical',
  primaryColor: 'default',
  navColor: 'integrate',
  compactLayout: true,
  fontSize: 16,
  fontFamily: themeConfig.fontFamily.primary,
  version: SETTINGS_SCHEMA_VERSION,
};
