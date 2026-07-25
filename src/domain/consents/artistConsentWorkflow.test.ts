import { describe, expect, it } from 'vitest';
import { canAttemptFinalSignature, shouldPersistTechnique } from './artistConsentWorkflow';

describe('artist consent workflow', () => {
  it.each([
    ['pending_technique', true],
    ['pending_artist', false],
    ['upload_error', false],
    ['signed', false],
    ['cancelled', false],
  ] as const)('persiste técnica para %s: %s', (status, expected) => {
    expect(shouldPersistTechnique(status)).toBe(expected);
  });

  it.each([
    ['pending_technique', false],
    ['pending_artist', true],
    ['upload_error', true],
    ['signed', false],
    ['cancelled', false],
  ] as const)('permite firma final para %s: %s', (status, expected) => {
    expect(canAttemptFinalSignature(status)).toBe(expected);
  });
});
