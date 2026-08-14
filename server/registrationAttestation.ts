export type RegistrationValidationVector = {
  name: string;
  input: string;
  valid: boolean;
};

const OUTER_ASCII_WHITESPACE = /^[\u0009-\u000d\u0020]+|[\u0009-\u000d\u0020]+$/g;
const EXACT_PLACEHOLDERS = new Set([
  'san/07/2024-c',
  'n/a', 'na', 'pendiente', 'por determinar', 'placeholder',
  'demo', 'test', 'prueba', 'ejemplo',
]);
const COMPLETE_BRACKET_PLACEHOLDER = /^(?:\[[\s\S]*\]|<[^]*>|\{[^]*\})$/;
const RESERVED_SENTINEL_PREFIX = /^(?:synth|synthetic|test|demo|fake)[-_/:]/i;

export function normalizeRegistrationNumber(value: string): string {
  return value.replace(OUTER_ASCII_WHITESPACE, '');
}

export function isValidRegistrationNumber(value: string): boolean {
  const normalized = normalizeRegistrationNumber(value);
  const folded = normalized.toLocaleLowerCase('en-US');
  const characterLength = [...normalized].length;
  return characterLength >= 1
    && characterLength <= 120
    && !EXACT_PLACEHOLDERS.has(folded)
    && !COMPLETE_BRACKET_PLACEHOLDER.test(normalized)
    && !RESERVED_SENTINEL_PREFIX.test(normalized);
}

export const REGISTRATION_VALIDATION_VECTORS: readonly RegistrationValidationVector[] = [
  { name: 'ASCII trim', input: '\t  RG À\u00a0/ 7 \r', valid: true },
  { name: 'empty', input: ' \t\n', valid: false },
  { name: 'one character', input: 'X', valid: true },
  { name: '120 Unicode characters', input: '😀'.repeat(120), valid: true },
  { name: '121 characters', input: 'x'.repeat(121), valid: false },
  { name: 'known demo', input: 'SAN/07/2024-C', valid: false },
  { name: 'placeholder case', input: 'PoR DeTeRmInAr', valid: false },
  { name: 'matching square brackets', input: '[pending value]', valid: false },
  { name: 'matching angle brackets', input: '<anything>', valid: false },
  { name: 'matching braces', input: '{anything}', valid: false },
  { name: 'mismatched brackets', input: '[anything}', valid: true },
  { name: 'sentinel delimiter', input: 'FAKE/value', valid: false },
  { name: 'sentinel space', input: 'FAKE value', valid: true },
  { name: 'allowed substring', input: 'prefix-demo-suffix', valid: true },
  { name: 'punctuation and accents', input: 'áccent.Mixed case / 42', valid: true },
];
