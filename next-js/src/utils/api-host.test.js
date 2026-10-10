import { it, expect, describe } from 'vitest';

import { DEFAULT_API_HOST, normalizeApiHost } from './api-host';

describe('normalizeApiHost', () => {
  it('uses the configured host, without a trailing slash or legacy suffix', () => {
    expect(normalizeApiHost('https://prod.example.app/')).toBe('https://prod.example.app');
    expect(normalizeApiHost('https://prod.example.app/supabaseservices/')).toBe(
      'https://prod.example.app'
    );
  });

  it('falls back to the default host when unset or set to the template demo server', () => {
    expect(normalizeApiHost('')).toBe(DEFAULT_API_HOST);
    expect(normalizeApiHost(undefined)).toBe(DEFAULT_API_HOST);
    expect(normalizeApiHost('https://api-dev-minimal-v700.pages.dev')).toBe(DEFAULT_API_HOST);
  });
});
