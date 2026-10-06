// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OBJECT_URL_LIFETIME_MS,
  openStorageDocument,
  saveBlobAsFile,
  startStorageDownload,
  type FileDownloadEnvironment,
} from './fileDownload';

function createEnvironment(): FileDownloadEnvironment {
  return {
    createObjectURL: vi.fn(() => 'blob:download-handle'),
    revokeObjectURL: vi.fn(),
    scheduleRevoke: (callback, delayMs) => window.setTimeout(callback, delayMs),
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('saveBlobAsFile', () => {
  it('clicks a download anchor and keeps the object URL alive until the revocation window elapses', () => {
    vi.useFakeTimers();
    const environment = createEnvironment();
    const blob = new Blob(['immutable-pdf']);
    let clickedAnchor: HTMLAnchorElement | undefined;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function captureAnchor() {
      clickedAnchor = this;
    });

    saveBlobAsFile(blob, 'Consentimiento_seguro.pdf', environment);

    expect(environment.createObjectURL).toHaveBeenCalledOnce();
    expect(environment.createObjectURL).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    expect(clickedAnchor?.download).toBe('Consentimiento_seguro.pdf');
    expect(clickedAnchor?.getAttribute('href')).toBe('blob:download-handle');
    expect(document.querySelector('a')).toBeNull();
    expect(environment.revokeObjectURL).not.toHaveBeenCalled();

    vi.advanceTimersByTime(OBJECT_URL_LIFETIME_MS);

    expect(environment.revokeObjectURL).toHaveBeenCalledOnce();
    expect(environment.revokeObjectURL).toHaveBeenCalledWith('blob:download-handle');
  });
});

describe('startStorageDownload', () => {
  it('clicks a signed-URL anchor without creating any object URL', () => {
    const createObjectURL = vi.fn(() => 'blob:should-not-happen');
    Object.defineProperty(window.URL, 'createObjectURL', { configurable: true, value: createObjectURL });
    let clickedAnchor: HTMLAnchorElement | undefined;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function captureAnchor() {
      clickedAnchor = this;
    });

    startStorageDownload('https://invalid.local/signed.pdf', 'Consentimiento_seguro.pdf');

    expect(click).toHaveBeenCalledOnce();
    expect(clickedAnchor?.download).toBe('Consentimiento_seguro.pdf');
    expect(clickedAnchor?.getAttribute('href')).toBe('https://invalid.local/signed.pdf');
    expect(clickedAnchor?.rel).toBe('noopener');
    expect(document.querySelector('a')).toBeNull();
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});

describe('openStorageDocument', () => {
  it('navigates with the injected navigator', () => {
    const navigate = vi.fn();

    openStorageDocument('https://invalid.local/signed.pdf', navigate);

    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('https://invalid.local/signed.pdf');
  });
});
