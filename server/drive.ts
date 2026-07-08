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
}): Promise<DriveUploadResult> {
  const { pdfBase64, fileName, carpetaDriveId, accessToken } = options;

  const metadata = {
    name: fileName,
    parents: [carpetaDriveId],
    mimeType: 'application/pdf',
  };

  const boundary = 'vod_ink_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/pdf\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    pdfBase64 +
    closeDelimiter;

  const driveRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

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
