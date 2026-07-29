export interface DriveUploadResult {
  driveFileId: string | null;
  driveViewLink: string | null;
  error?: string;
}

export async function uploadToDrive(options: {
  pdfBase64: string;
  fileName: string;
  carpetaDriveId: string;
  accessToken: string;
  consentId?: string;
  pdfSha256?: string;
}): Promise<DriveUploadResult> {
  const {
    pdfBase64,
    fileName,
    carpetaDriveId,
    accessToken,
    consentId,
    pdfSha256,
  } = options;

  if (consentId && pdfSha256) {
    const query = encodeURIComponent(
      `'${carpetaDriveId}' in parents and trashed = false and appProperties has { key = 'vod_ink_consent_id' and value = '${consentId}' } and appProperties has { key = 'vod_ink_sha256' and value = '${pdfSha256}' }`,
    );
    try {
      const existingRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&pageSize=1&fields=files(id,webViewLink)`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (existingRes.ok) {
        const existing = (await existingRes.json()) as {
          files?: { id: string; webViewLink?: string }[];
        };
        const file = existing.files?.[0];
        if (file) {
          return {
            driveFileId: file.id,
            driveViewLink:
              file.webViewLink ??
              `https://drive.google.com/file/d/${file.id}/view`,
          };
        }
      }
    } catch {
      // A failed lookup is recoverable; the caller owns the compare-and-set claim.
    }
  }

  const metadata = {
    name: fileName,
    parents: [carpetaDriveId],
    mimeType: "application/pdf",
    ...(consentId && pdfSha256
      ? {
          appProperties: {
            vod_ink_consent_id: consentId,
            vod_ink_sha256: pdfSha256,
          },
        }
      : {}),
  };

  const boundary = "vod_ink_boundary";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    JSON.stringify(metadata) +
    delimiter +
    "Content-Type: application/pdf\r\n" +
    "Content-Transfer-Encoding: base64\r\n\r\n" +
    pdfBase64 +
    closeDelimiter;

  const driveRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    },
  );

  if (!driveRes.ok) {
    const text = await driveRes.text();
    return { driveFileId: null, driveViewLink: null, error: text };
  }

  const driveData = (await driveRes.json()) as { id: string };
  return {
    driveFileId: driveData.id,
    driveViewLink: `https://drive.google.com/file/d/${driveData.id}/view`,
  };
}
