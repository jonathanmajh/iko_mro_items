import { describe, it, expect, beforeEach } from 'vitest';
import { resetEnv } from './helpers/db.js';

describe('matchAndScore', () => {
  let matchAndScore;
  beforeEach(() => {
    resetEnv();
    globalThis.postMessage = () => {};
    matchAndScore = require('../assets/indexDB').matchAndScore;
  });

  it('scores intersections by matched item count over total phases', () => {
    // [{count, itemNums}, ...] grouped by score fraction
    const result = matchAndScore([
      [2, ['A', 'B', 'C']],
      [1, ['B', 'C']],
    ]);
    // 2/2 -> 1, 1/2 -> 0.5
    expect(result[1]).toEqual(['A', 'B', 'C']);
    // items already saved under a higher score are not duplicated
    expect(result[0.5]).toEqual([]);
  });

  it('does not duplicate an item already counted in a higher-scoring group', () => {
    const result = matchAndScore([
      [3, ['X', 'Y']],
      [2, ['X', 'Z']],
    ]);
    expect(result[1]).toEqual(['X', 'Y']);
    expect(result[2 / 3]).toEqual(['Z']);
  });
});

describe('itemOccurrence', () => {
  let itemOccurrence;
  beforeEach(() => {
    resetEnv();
    globalThis.postMessage = () => {};
    itemOccurrence = require('../assets/indexDB').itemOccurrence;
  });

  it('builds a phrase-occurrence tree from item descriptions', () => {
    const data = [
      ['1', 'PUMP,MAIN'],
      ['2', 'PUMP,AUX'],
    ];
    const result = itemOccurrence(data, []);
    expect(result.get('PUMP').count).toBe(2);
    expect(result.get('PUMP,MAIN').phrase).toBe('MAIN');
    expect(result.get('PUMP,AUX').parent).toBe('PUMP');
  });

  it('skips phrases containing numbers and manufacturer names', () => {
    const data = [
      ['1', 'BEARING,6205'],
    ];
    const result = itemOccurrence(data, ['BEARING']);
    expect(result.size).toBe(0);
  });
});