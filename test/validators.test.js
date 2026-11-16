import { describe, it, expect, beforeEach } from 'vitest';
import { resetEnv, seedItemDb } from './helpers/db.js';

describe('Validate.assembleDescription', () => {
  let Validate;
  beforeEach(() => {
    resetEnv();
    seedItemDb();
    globalThis.postMessage = () => {};
    Validate = require('../assets/validators');
  });

  it('builds a 4-element description array, packing phrases and uppercasing', () => {
    const v = new Validate();
    const [jde1, jde2, jde3, maximo] = v.assembleDescription(['grease', 'SAE', '30']);
    expect([jde1, jde2, jde3, maximo]).toHaveLength(4);
    expect(jde1).toBe('GREASE,SAE,30');
    expect(maximo).toBe('GREASE,SAE,30'); // empty JDE slots are filtered
  });

  it('moves a trailing manufacturer into the manufacturer slot', () => {
    const v = new Validate();
    const result = v.assembleDescription(['GREASE', 'SAE', '30', 'BOSCH']);
    expect(result[2]).toBe('BOSCH');
    expect(result[0]).toBe('GREASE,SAE,30');
  });

  it('keeps numeric phrases as-is (no uppercasing)', () => {
    const v = new Validate();
    const result = v.assembleDescription(['BEARING', '6205-2RS']);
    expect(result[0]).toBe('BEARING,6205-2RS');
  });
});

describe('Validate.validateSingle', () => {
  let Validate;
  beforeEach(() => {
    resetEnv();
    seedItemDb();
    globalThis.postMessage = () => {};
    Validate = require('../assets/validators');
  });

  it('replaces an abbreviation with its expanded form', async () => {
    const v = new Validate();
    const result = await v.validateSingle('GREASE HD');
    // HEAVY DUTY is the replacement for HD
    expect(result[0]).toContain('HEAVY DUTY');
  });
});