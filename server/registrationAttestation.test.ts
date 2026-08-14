import { describe, expect, it } from 'vitest';
import {
  REGISTRATION_VALIDATION_VECTORS,
  isValidRegistrationNumber,
  normalizeRegistrationNumber,
} from './registrationAttestation.js';

describe('registration attestation validator parity vectors', () => {
  it('normalizes only outer ASCII whitespace and validates the RED vectors', () => {
    expect(normalizeRegistrationNumber('\t\n  Reg À\u00a0/ 7  \r')).toBe('Reg À\u00a0/ 7');
    expect(REGISTRATION_VALIDATION_VECTORS.length).toBeGreaterThan(10);
    for (const vector of REGISTRATION_VALIDATION_VECTORS) {
      expect(isValidRegistrationNumber(vector.input), vector.name).toBe(vector.valid);
    }
  });

  it('uses exact case-insensitive deny rules without substring or format allowlists', () => {
    expect(isValidRegistrationNumber('demo')).toBe(false);
    expect(isValidRegistrationNumber('DeMo')).toBe(false);
    expect(isValidRegistrationNumber('[pending value]')).toBe(false);
    expect(isValidRegistrationNumber('[pending value}')).toBe(true);
    expect(isValidRegistrationNumber('DEMO:value')).toBe(false);
    expect(isValidRegistrationNumber('DEMO value')).toBe(true);
    expect(isValidRegistrationNumber('prefix-demo-suffix')).toBe(true);
    expect(isValidRegistrationNumber('áccent.Mixed case / 42')).toBe(true);
  });

  it('compares normalized values byte-for-byte', () => {
    expect(normalizeRegistrationNumber('  Mixed-Case  ')).toBe(
      normalizeRegistrationNumber('\tMixed-Case\n')
    );
    expect(normalizeRegistrationNumber('Mixed-Case')).not.toBe(
      normalizeRegistrationNumber('mixed-case')
    );
    expect(normalizeRegistrationNumber('A B')).not.toBe(normalizeRegistrationNumber('A  B'));
  });
});
