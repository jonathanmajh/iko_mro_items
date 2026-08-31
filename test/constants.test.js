import { describe, it, expect, afterEach } from 'vitest';

const CONSTANTS_MODULE = '../assets/constants.js';
const ORIGINAL_ENV = { ...process.env };

function loadConstants() {
  const resolved = require.resolve(CONSTANTS_MODULE);
  delete require.cache[resolved];
  return require(resolved);
}

describe('constants', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    const resolved = require.resolve(CONSTANTS_MODULE);
    delete require.cache[resolved];
  });

  it('defaults ENV to production maximo when MAXIMO_ENV not set', () => {
    delete process.env.MAXIMO_ENV;
    expect(loadConstants().ENV).toBe('prod.manage.prod.iko.max-it-eam.com');
  });

  it('uses MAXIMO_ENV when provided', () => {
    process.env.MAXIMO_ENV = 'mas.manage.uat.ikona-np.naviam.app';
    expect(loadConstants().ENV).toBe('mas.manage.uat.ikona-np.naviam.app');
  });

  it('OPEN_DEV_TOOLS defaults to false and honors true', () => {
    delete process.env.OPEN_DEV_TOOLS;
    expect(loadConstants().OPEN_DEV_TOOLS).toBe(false);

    process.env.OPEN_DEV_TOOLS = 'true';
    expect(loadConstants().OPEN_DEV_TOOLS).toBe(true);
  });

  it('is frozen to prevent accidental mutation', () => {
    delete process.env.MAXIMO_ENV;
    const CONSTANTS = loadConstants();
    expect(Object.isFrozen(CONSTANTS)).toBe(true);
    expect(Object.isFrozen(CONSTANTS.REPLACEMENTS)).toBe(true);
    expect(Object.isFrozen(CONSTANTS.FIREBASECONFIG)).toBe(true);
  });

  it('normalizes typographic quotes/hyphens via REPLACEMENTS', () => {
    const CONSTANTS = loadConstants();
    expect(CONSTANTS.REPLACEMENTS['’']).toBe("'");
    expect(CONSTANTS.REPLACEMENTS['“']).toBe('"');
    expect(CONSTANTS.REPLACEMENTS['−']).toBe('-');
  });
});