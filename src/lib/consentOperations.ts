export type ConsentZipCandidate = {
  id: string;
  status: string;
  finalFileId: string | null;
};

export type FinalConsentFile = {
  id: string;
  consentId: string;
  storagePath: string;
};

export type ExportOutcome = {
  eligible: number;
  downloaded: number;
  skipped: number;
  failed: number;
};

type ArchiveWriter = {
  file(name: string, data: Blob): unknown;
  generateAsync(options: { type: 'blob' }): Promise<Blob>;
};

export type ConsentZipDependencies = {
  loadFinalFiles(ids: string[]): Promise<{ data: FinalConsentFile[] | null; error: unknown }>;
  downloadFile(path: string): Promise<{ data: Blob | null; error: unknown }>;
  createArchive(): ArchiveWriter;
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
  saveArchive(url: string, name: string): void | Promise<void>;
  archiveName: string;
};

export type ConsentZipResult =
  | { status: 'downloaded'; outcome: ExportOutcome }
  | { status: 'refused'; reason: 'NO_ELIGIBLE_FILES' | 'NO_FILES_DOWNLOADED' | 'ARCHIVE_FAILED'; outcome: ExportOutcome };

function uniqueOpaqueNames(consents: ConsentZipCandidate[]) {
  const used = new Set<string>();
  return consents.map(({ id }) => {
    const opaqueId = id.replace(/[^a-zA-Z0-9_-]/g, '_') || 'documento';
    const base = `Consentimiento_${opaqueId}`;
    let occurrence = 1;
    let filename = `${base}.pdf`;
    while (used.has(filename)) filename = `${base}_${++occurrence}.pdf`;
    used.add(filename);
    return filename;
  });
}

export async function exportConsentZip(
  consents: ConsentZipCandidate[],
  dependencies: ConsentZipDependencies,
): Promise<ConsentZipResult> {
  const eligible = consents.filter(
    (consent): consent is ConsentZipCandidate & { finalFileId: string } =>
      consent.status === 'signed' && Boolean(consent.finalFileId),
  );
  const outcome: ExportOutcome = {
    eligible: eligible.length,
    downloaded: 0,
    skipped: consents.length - eligible.length,
    failed: 0,
  };

  if (eligible.length === 0) return { status: 'refused', reason: 'NO_ELIGIBLE_FILES', outcome };

  let loaded: Awaited<ReturnType<ConsentZipDependencies['loadFinalFiles']>>;
  try {
    loaded = await dependencies.loadFinalFiles(eligible.map(({ finalFileId }) => finalFileId));
  } catch {
    outcome.failed = eligible.length;
    return { status: 'refused', reason: 'NO_FILES_DOWNLOADED', outcome };
  }
  if (loaded.error || !loaded.data) {
    outcome.failed = eligible.length;
    return { status: 'refused', reason: 'NO_FILES_DOWNLOADED', outcome };
  }

  let archive: ArchiveWriter;
  try {
    archive = dependencies.createArchive();
  } catch {
    return { status: 'refused', reason: 'ARCHIVE_FAILED', outcome };
  }
  const filenames = uniqueOpaqueNames(eligible);
  await Promise.all(eligible.map(async (consent, index) => {
    const finalFile = loaded.data!.find(
      (file) => file.id === consent.finalFileId && file.consentId === consent.id,
    );
    if (!finalFile) {
      outcome.failed += 1;
      return;
    }

    try {
      const downloaded = await dependencies.downloadFile(finalFile.storagePath);
      if (downloaded.error || !downloaded.data) {
        outcome.failed += 1;
        return;
      }
      archive.file(filenames[index], downloaded.data);
      outcome.downloaded += 1;
    } catch {
      outcome.failed += 1;
    }
  }));

  if (outcome.downloaded === 0) return { status: 'refused', reason: 'NO_FILES_DOWNLOADED', outcome };

  let url: string | undefined;
  try {
    const blob = await archive.generateAsync({ type: 'blob' });
    url = dependencies.createObjectURL(blob);
    await dependencies.saveArchive(url, dependencies.archiveName);
    return { status: 'downloaded', outcome };
  } catch {
    return { status: 'refused', reason: 'ARCHIVE_FAILED', outcome };
  } finally {
    if (url) {
      try { dependencies.revokeObjectURL(url); } catch { /* preserve opaque result */ }
    }
  }
}
