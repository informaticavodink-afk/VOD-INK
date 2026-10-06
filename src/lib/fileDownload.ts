/**
 * Single place where the browser is asked to save or open a document.
 *
 * Object URLs are revoked only after the transfer has started: revoking them in
 * the same task as the click cancels the download on WebKit/iOS
 * (WebKit bug 211234), which broke downloads on iPad and iPhone.
 */
export const OBJECT_URL_LIFETIME_MS = 60_000;

export interface FileDownloadEnvironment {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
  scheduleRevoke(callback: () => void, delayMs: number): void;
}

const defaultEnvironment: FileDownloadEnvironment = {
  createObjectURL: (blob) => window.URL.createObjectURL(blob),
  revokeObjectURL: (url) => window.URL.revokeObjectURL(url),
  scheduleRevoke: (callback, delayMs) => window.setTimeout(callback, delayMs),
};

export function saveBlobAsFile(
  blob: Blob,
  filename: string,
  environment: FileDownloadEnvironment = defaultEnvironment,
): void {
  const url = environment.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    document.body.removeChild(link);
    environment.scheduleRevoke(() => environment.revokeObjectURL(url), OBJECT_URL_LIFETIME_MS);
  }
}

export function startStorageDownload(signedUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = signedUrl;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    document.body.removeChild(link);
  }
}

export function openStorageDocument(
  signedUrl: string,
  navigate: (url: string) => void = (url) => window.location.assign(url),
): void {
  navigate(signedUrl);
}
