import { describe, expect, it } from 'vitest';
import {
  AGE_OF_MAJORITY_YEARS,
  calculateAge,
  getMadridConsentDate,
  isMinorOnConsentDate,
} from './age';

describe('consent age policy', () => {
  it('uses 18 and the injected local calendar date', () => {
    expect(AGE_OF_MAJORITY_YEARS).toBe(18);
    expect(calculateAge('2008-06-16', '2026-06-15')).toBe(17);
    expect(calculateAge('2008-06-15', '2026-06-15')).toBe(18);
    expect(isMinorOnConsentDate('2008-06-15', '2026-06-15')).toBe(false);
  });

  it('parses date-only values without UTC rollover, including leap boundaries', () => {
    expect(calculateAge('2008-06-15', '2026-06-14')).toBe(17);
    expect(calculateAge('2008-02-29', '2026-02-28')).toBe(17);
    expect(calculateAge('2008-02-29', '2026-03-01')).toBe(18);
    expect(calculateAge('2008-06-15', new Date('2026-06-15T23:30:00.000Z'))).toBe(18);
  });

  it('derives the Europe/Madrid consent date from an instant', () => {
    expect(getMadridConsentDate(new Date('2026-06-15T22:30:00.000Z'))).toBe('2026-06-16');
  });
});
