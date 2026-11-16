import { describe, it, expect } from 'vitest';
import { getCombinations, inOrderCombinations, STRINGCLEANUP } from '../assets/utils.js';

describe('getCombinations', () => {
  it('returns all non-empty subsets sorted by length', () => {
    const combos = getCombinations(['a', 'b', 'c']);
    expect(combos.length).toBe(2 ** 3 - 1);
    expect(combos).toEqual([
      ['a'],
      ['b'],
      ['c'],
      ['a', 'b'],
      ['a', 'c'],
      ['b', 'c'],
      ['a', 'b', 'c'],
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(getCombinations([])).toEqual([]);
  });

  it('matches hand-computed subset sum for powerset cardinality', () => {
    const input = [1, 2, 3, 4];
    expect(getCombinations(input).length).toBe(15);
  });
});

describe('inOrderCombinations', () => {
  it('returns all contiguous subarrays', () => {
    expect(inOrderCombinations([1, 2, 3])).toEqual([
      [1],
      [2],
      [3],
      [1, 2],
      [2, 3],
      [1, 2, 3],
    ]);
  });
});

describe('STRINGCLEANUP', () => {
  it('contains the whitespace/comma/hyphen cleanup characters', () => {
    expect(STRINGCLEANUP).toContain(',');
    expect(STRINGCLEANUP).toContain('-');
    expect(STRINGCLEANUP).toContain(' ');
  });
});