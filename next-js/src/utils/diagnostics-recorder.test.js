import { it, expect, describe } from 'vitest';

import { scrub } from './diagnostics-recorder';

describe('scrub (what an issue report may carry)', () => {
  it('removes bearer tokens, JWTs, passwords and one-time codes', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnop';
    expect(scrub('Authorization: Bearer abcdefghijklmnopqrstuvwxyz')).toBe(
      'Authorization: Bearer [redacted]'
    );
    expect(scrub(`session ${jwt}`)).toBe('session [jwt]');
    expect(scrub('{"password":"hunter22"}')).toBe('{"password":"[redacted]"}');
    const callback = scrub('/auth/v1/callback?code=abc123#x');
    expect(callback).toContain('/auth/v1/callback?code=[redacted]');
    expect(callback).not.toContain('abc123');
    expect(scrub('verify code: 123456')).toBe('verify code: [redacted]');
  });

  it('keeps ordinary messages readable', () => {
    expect(scrub('POST /totp/verify-setup failed: Invalid code. Please try again.')).toBe(
      'POST /totp/verify-setup failed: Invalid code. Please try again.'
    );
  });
});
