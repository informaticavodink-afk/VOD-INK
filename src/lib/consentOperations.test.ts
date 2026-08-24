import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportConsentZip, type ConsentZipDependencies } from './consentOperations';

const good = { id: 'consent-a', status: 'signed', finalFileId: 'file-a' };
const second = { id: 'consent-b', status: 'signed', finalFileId: 'file-b' };
const pending = { id: 'consent-pending', status: 'pending_artist', finalFileId: null };

function harness() {
  const archive = {
    file: vi.fn(),
    generateAsync: vi.fn().mockResolvedValue(new Blob(['zip'])),
  };
  const deps: ConsentZipDependencies = {
    loadFinalFiles: vi.fn().mockResolvedValue({
      data: [
        { id: 'file-a', consentId: 'consent-a', storagePath: 'immutable/a.pdf' },
        { id: 'file-b', consentId: 'consent-b', storagePath: 'immutable/b.pdf' },
      ],
      error: null,
    }),
    downloadFile: vi.fn().mockResolvedValue({ data: new Blob(['pdf']), error: null }),
    createArchive: vi.fn(() => archive),
    createObjectURL: vi.fn(() => 'blob:zip'),
    revokeObjectURL: vi.fn(),
    saveArchive: vi.fn(),
    archiveName: 'Consentimientos_2026-08-21.zip',
  };
  return { archive, deps };
}

let current: ReturnType<typeof harness>;

beforeEach(() => {
  current = harness();
});

describe('exportConsentZip', () => {
  it('archives actual downloads and reports partial success without diagnostics containing PII', async () => {
    vi.mocked(current.deps.downloadFile)
      .mockResolvedValueOnce({ data: new Blob(['pdf-a']), error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('private path and client name') });

    const result = await exportConsentZip([good, second, pending], current.deps);

    expect(result).toEqual({
      status: 'downloaded',
      outcome: { eligible: 2, downloaded: 1, skipped: 1, failed: 1 },
    });
    expect(current.archive.file).toHaveBeenCalledOnce();
    expect(current.archive.file).toHaveBeenCalledWith('Consentimiento_consent-a.pdf', expect.any(Blob));
    expect(current.deps.saveArchive).toHaveBeenCalledWith('blob:zip', 'Consentimientos_2026-08-21.zip');
    expect(current.deps.revokeObjectURL).toHaveBeenCalledWith('blob:zip');
    expect(JSON.stringify(result)).not.toContain('private path');
  });

  it('refuses zero-success exports and never creates an empty archive', async () => {
    vi.mocked(current.deps.loadFinalFiles).mockResolvedValue({ data: [], error: null });

    const result = await exportConsentZip([good], current.deps);

    expect(result).toEqual({
      status: 'refused',
      reason: 'NO_FILES_DOWNLOADED',
      outcome: { eligible: 1, downloaded: 0, skipped: 0, failed: 1 },
    });
    expect(current.archive.generateAsync).not.toHaveBeenCalled();
    expect(current.deps.createObjectURL).not.toHaveBeenCalled();
    expect(current.deps.saveArchive).not.toHaveBeenCalled();
  });

  it('counts ineligible consents as skipped without loading final metadata', async () => {
    const result = await exportConsentZip([pending], current.deps);

    expect(result).toEqual({
      status: 'refused',
      reason: 'NO_ELIGIBLE_FILES',
      outcome: { eligible: 0, downloaded: 0, skipped: 1, failed: 0 },
    });
    expect(current.deps.loadFinalFiles).not.toHaveBeenCalled();
  });

  it('uses unique opaque names and downloads only exact final-file matches', async () => {
    const firstUnsafe = { id: 'opaque/a', status: 'signed', finalFileId: 'file-a' };
    const secondUnsafe = { id: 'opaque:a', status: 'signed', finalFileId: 'file-b' };
    const suffixCollision = { id: 'opaque_a_2', status: 'signed', finalFileId: 'file-c' };
    vi.mocked(current.deps.loadFinalFiles).mockResolvedValue({
      data: [
        { id: 'file-a', consentId: 'opaque/a', storagePath: 'immutable/a.pdf' },
        { id: 'file-b', consentId: 'opaque:a', storagePath: 'immutable/b.pdf' },
        { id: 'file-c', consentId: 'opaque_a_2', storagePath: 'immutable/c.pdf' },
        { id: 'file-a', consentId: 'wrong-consent', storagePath: 'mutable/rogue.pdf' },
      ],
      error: null,
    });

    const result = await exportConsentZip([firstUnsafe, secondUnsafe, suffixCollision], current.deps);

    expect(result).toEqual({ status: 'downloaded', outcome: { eligible: 3, downloaded: 3, skipped: 0, failed: 0 } });
    expect(current.deps.loadFinalFiles).toHaveBeenCalledWith(['file-a', 'file-b', 'file-c']);
    expect(current.deps.downloadFile).toHaveBeenCalledWith('immutable/a.pdf');
    expect(current.deps.downloadFile).toHaveBeenCalledWith('immutable/b.pdf');
    expect(current.deps.downloadFile).not.toHaveBeenCalledWith('mutable/rogue.pdf');
    expect(current.archive.file.mock.calls.map(([name]) => name)).toEqual([
      'Consentimiento_opaque_a.pdf',
      'Consentimiento_opaque_a_2.pdf',
      'Consentimiento_opaque_a_2_2.pdf',
    ]);
  });

  it('normalizes rejected metadata loading without leaking its detail', async () => {
    vi.mocked(current.deps.loadFinalFiles).mockRejectedValue(new Error('client DNI and private path'));

    const result = await exportConsentZip([good], current.deps);

    expect(result).toEqual({
      status: 'refused',
      reason: 'NO_FILES_DOWNLOADED',
      outcome: { eligible: 1, downloaded: 0, skipped: 0, failed: 1 },
    });
    expect(JSON.stringify(result)).not.toContain('client DNI');
    expect(current.deps.createArchive).not.toHaveBeenCalled();
  });

  it('normalizes archive construction failures to an opaque result', async () => {
    vi.mocked(current.deps.createArchive).mockImplementation(() => { throw new Error('private archive detail'); });

    const result = await exportConsentZip([good], current.deps);

    expect(result).toEqual({
      status: 'refused',
      reason: 'ARCHIVE_FAILED',
      outcome: { eligible: 1, downloaded: 0, skipped: 0, failed: 0 },
    });
    expect(JSON.stringify(result)).not.toContain('private archive detail');
  });

  it('revokes the archive URL and reports an opaque refusal when saving fails', async () => {
    vi.mocked(current.deps.saveArchive).mockRejectedValue(new Error('private browser detail'));
    vi.mocked(current.deps.revokeObjectURL).mockImplementation(() => { throw new Error('private cleanup detail'); });

    const result = await exportConsentZip([good], current.deps);

    expect(result).toEqual({
      status: 'refused',
      reason: 'ARCHIVE_FAILED',
      outcome: { eligible: 1, downloaded: 1, skipped: 0, failed: 0 },
    });
    expect(current.deps.revokeObjectURL).toHaveBeenCalledWith('blob:zip');
    expect(JSON.stringify(result)).not.toContain('private browser detail');
  });
});
