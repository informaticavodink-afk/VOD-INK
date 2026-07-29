import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadToDrive } from "./drive";

describe("Drive finalization metadata", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends consent and hash metadata with the final PDF upload", async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "drive-synthetic" }),
      });

    await expect(uploadToDrive({
      pdfBase64: "c3ludGhldGlj",
      fileName: "synthetic.pdf",
      carpetaDriveId: "folder-synthetic",
      accessToken: "token-synthetic",
      consentId: "consent-synthetic",
      pdfSha256: "hash-synthetic",
    })).resolves.toMatchObject({
      driveFileId: "drive-synthetic",
      driveViewLink: "https://drive.google.com/file/d/drive-synthetic/view",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const uploadRequest = fetchMock.mock.calls[1][1] as { body: string };
    const metadataPart = uploadRequest.body.match(
      /Content-Type: application\/json; charset=UTF-8\r\n\r\n([\s\S]*?)\r\n--vod_ink_boundary/,
    );
    expect(metadataPart).not.toBeNull();
    expect(JSON.parse(metadataPart![1])).toEqual({
      name: "synthetic.pdf",
      parents: ["folder-synthetic"],
      mimeType: "application/pdf",
      appProperties: {
        vod_ink_consent_id: "consent-synthetic",
        vod_ink_sha256: "hash-synthetic",
      },
    });
  });
});
