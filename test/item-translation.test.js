import { describe, it, expect, beforeEach } from 'vitest';
import { resetEnv, seedTranslationDb, seedItemDb } from './helpers/db.js';

describe('TranslateDescription.contextTranslate', () => {
  let TranslateDescription;
  beforeEach(() => {
    resetEnv();
    seedTranslationDb();
    seedItemDb();
    globalThis.postMessage = () => {};
    TranslateDescription = require('../assets/item_translation/item-translation');
  });

  it('translates whole phrases found in the dictionary', () => {
    const t = new TranslateDescription();
    const result = t.contextTranslate('BOLT', 'FR', 'return');
    expect(result.description).toBe('BOULON');
    expect(result.missing).toEqual([]);
  });

  it('leaves manufacturer words untranslated', () => {
    const t = new TranslateDescription();
    const result = t.contextTranslate('BOLT,BOSCH', 'FR', 'return');
    expect(result.description).toBe('BOULON,BOSCH');
  });

  it('collects missing translations for known-unknown words', () => {
    const t = new TranslateDescription();
    const result = t.contextTranslate('ZIRCOP', 'FR', 'return');
    expect(result.description).toBe('ZIRCOP');
    expect(result.missing).toEqual(['ZIRCOP']);
  });
});