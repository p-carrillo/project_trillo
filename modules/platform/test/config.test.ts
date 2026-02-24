import { describe, expect, it } from 'vitest';
import { loadPlatformConfig } from '../infrastructure';

describe('Platform config', () => {
  it('disables development fixtures by default', () => {
    const config = loadPlatformConfig({});

    expect(config.fixtures.developmentEnabled).toBe(false);
  });

  it('enables development fixtures when explicitly set', () => {
    const config = loadPlatformConfig({
      DEV_FIXTURES_ENABLED: 'true'
    });

    expect(config.fixtures.developmentEnabled).toBe(true);
  });

  it('rejects invalid fixture flag values', () => {
    expect(() =>
      loadPlatformConfig({
        DEV_FIXTURES_ENABLED: 'definitely'
      })
    ).toThrow('Boolean environment variable must be one of: true/false, 1/0, yes/no.');
  });
});
