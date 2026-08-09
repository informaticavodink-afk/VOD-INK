import { beforeEach, describe, expect, it, vi } from "vitest";
import { SubmissionError, normalizeSubmissionError, submitConsentToApi } from "./submissions";

const valid = { error: { code: "SUBMISSION_FAILED", message: "Mensaje seguro", retryable: true, correlationId: "ref-123" } };

describe("submission failure normalization", () => {
	beforeEach(() => vi.restoreAllMocks());
	it("accepts only the structured allow-listed envelope", () => {
		expect(normalizeSubmissionError(valid, 500)).toMatchObject({ code: "SUBMISSION_FAILED", message: "Mensaje seguro", retryable: true, correlationId: "ref-123" });
	});
	it.each([
		[{ error: "CANARY legacy" }, 400],
		[{ error: { ...valid.error, code: "UNKNOWN" } }, 500],
		[{ error: { ...valid.error, correlationId: "x".repeat(200) } }, 500],
		["<html>CANARY</html>", 502], [null, 500],
	])("redacts malformed or untrusted bodies", (body, status) => {
		const result = normalizeSubmissionError(body, status);
		expect(result).toBeInstanceOf(SubmissionError);
		expect(JSON.stringify(result)).not.toMatch(/CANARY|html|UNKNOWN/);
	});
	it("parses JSON once and normalizes HTTP failure", async () => {
		const json = vi.fn().mockResolvedValue(valid);
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json }));
		await expect(submitConsentToApi({} as never)).rejects.toMatchObject({ code: "SUBMISSION_FAILED", correlationId: "ref-123" });
		expect(json).toHaveBeenCalledTimes(1);
	});
	it("normalizes malformed JSON and network rejection", async () => {
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502, json: vi.fn().mockRejectedValue(new Error("CANARY body")) }));
		await expect(submitConsentToApi({} as never)).rejects.toBeInstanceOf(SubmissionError);
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("CANARY network")));
		await expect(submitConsentToApi({} as never)).rejects.toMatchObject({ code: "SUBMISSION_FAILED", retryable: true });
	});
});
