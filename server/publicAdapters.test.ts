import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./publicArtists.js", () => ({ listPublicArtists: vi.fn() }));
vi.mock("./consents.js", () => ({
	generateAndSubmitConsent: vi.fn(),
	cancelConsentAsArtist: vi.fn(),
	saveConsentTechnique: vi.fn(),
	signConsentAsArtist: vi.fn(),
	toFinalizationErrorEnvelope: vi.fn(),
}));
vi.mock("../utils/supabase/vercel.js", () => ({
	createVercelSupabaseClient: vi.fn(),
}));

import { listPublicArtists } from "./publicArtists.js";
import { generateAndSubmitConsent, signConsentAsArtist, toFinalizationErrorEnvelope } from "./consents.js";
import { createVercelSupabaseClient } from "../utils/supabase/vercel.js";
import { PublicBoundaryError } from "./publicStudio.js";
import { getPublicArtists } from "./routes/publicArtists.js";
import consentsRouter, { createConsent } from "./routes/consents.js";
import vercelPublicArtists from "../api/public/artists.js";
import vercelCreateConsent from "../api/consents/index.js";
import vercelSignArtist from "../api/consents/[id]/sign-artist.js";

const mockedListPublicArtists = vi.mocked(listPublicArtists);
const mockedGenerateConsent = vi.mocked(generateAndSubmitConsent);
const mockedSignConsent = vi.mocked(signConsentAsArtist);
const mockedFinalizationEnvelope = vi.mocked(toFinalizationErrorEnvelope);
const mockedCreateVercelSupabaseClient = vi.mocked(createVercelSupabaseClient);

function expressResponse() {
	const result = { statusCode: 200, body: undefined as unknown };
	let resolveFinished!: () => void;
	const finished = new Promise<void>((resolve) => { resolveFinished = resolve; });
	const response = {
		status(code: number) {
			result.statusCode = code;
			return response;
		},
		json(body: unknown) {
			result.body = body;
			resolveFinished();
			return response;
		},
	};
	return { response: response as unknown as Response, result, finished };
}

function vercelRequest(method: string, body?: unknown, url = "/api/test", headers: Record<string, string> = {}) {
	const request = Readable.from(
		body === undefined ? [] : [JSON.stringify(body)],
	);
	return Object.assign(request, {
		method,
		url,
		headers,
	}) as IncomingMessage;
}

function vercelResponse() {
	const result = {
		statusCode: 200,
		body: undefined as unknown,
		headers: {} as Record<string, unknown>,
	};
	const response = {
		set statusCode(code: number) {
			result.statusCode = code;
		},
		get statusCode() {
			return result.statusCode;
		},
		setHeader(name: string, value: unknown) {
			result.headers[name] = value;
		},
		end(chunk?: string) {
			result.body = chunk ? JSON.parse(chunk) : undefined;
		},
	};
	return { response: response as unknown as ServerResponse, result };
}

describe("Express and Vercel public boundary envelopes", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "error").mockImplementation(() => undefined);
	});

	it("emits the same PUBLIC_STUDIO_CONTEXT_INVALID envelope from both artist adapters", async () => {
		mockedListPublicArtists.mockRejectedValue(
			new PublicBoundaryError("PUBLIC_STUDIO_CONTEXT_INVALID"),
		);
		const express = expressResponse();
		const vercel = vercelResponse();

		await getPublicArtists({} as Request, express.response);
		await vercelPublicArtists(vercelRequest("GET"), vercel.response);

		const expected = {
			error: {
				code: "PUBLIC_STUDIO_CONTEXT_INVALID",
				message: "El estudio público no está disponible.",
				retryable: false,
			},
		};
		expect(express.result).toMatchObject({ statusCode: 503, body: expected });
		expect(vercel.result).toMatchObject({ statusCode: 503, body: expected });
	});

	it("returns the same four-key public JSON from both artist adapters", async () => {
		const artist = {
			id: "55555555-5555-4555-8555-555555555555",
			displayName: "Artista de Adaptador",
			qualification: "Cualificación sintética",
			photoUrl: null,
		};
		mockedListPublicArtists.mockResolvedValue([artist]);
		const express = expressResponse();
		const vercel = vercelResponse();

		await getPublicArtists({} as Request, express.response);
		await vercelPublicArtists(vercelRequest("GET"), vercel.response);

		expect(express.result).toMatchObject({
			statusCode: 200,
			body: { artists: [artist] },
		});
		expect(vercel.result).toMatchObject({
			statusCode: 200,
			body: { artists: [artist] },
		});
		expect(
			Object.keys(
				(express.result.body as { artists: [unknown] }).artists[0] as object,
			).sort(),
		).toEqual(["displayName", "id", "photoUrl", "qualification"]);
	});

	it("emits the same ARTIST_NOT_AVAILABLE envelope without logging request data", async () => {
		mockedGenerateConsent.mockRejectedValue(
			new PublicBoundaryError("ARTIST_NOT_AVAILABLE"),
		);
		const sensitiveMarker = "SYNTHETIC-REQUEST-MARKER";
		const body = {
			state: { artistId: "synthetic", privateMarker: sensitiveMarker },
			idempotencyKey: "key",
		};
		const express = expressResponse();
		const vercel = vercelResponse();

		await createConsent({ body } as Request, express.response);
		await vercelCreateConsent(vercelRequest("POST", body), vercel.response);

		const expected = {
			error: {
				code: "ARTIST_NOT_AVAILABLE",
				message: "El tatuador seleccionado no está disponible.",
				retryable: false,
			},
		};
		expect(express.result).toMatchObject({ statusCode: 422, body: expected });
		expect(vercel.result).toMatchObject({ statusCode: 422, body: expected });
		expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
			sensitiveMarker,
		);
	});

	it("emits the same stable finalization envelope from Express and Vercel sign-artist adapters", async () => {
		const envelope = {
			status: 409,
			body: {
				error: {
					code: "STUDIO_HEALTH_UNVERIFIED",
					message: "Faltan datos sanitarios verificados del estudio.",
					retryable: true,
				},
			},
		} as const;
		mockedSignConsent.mockRejectedValue(new Error("synthetic-finalization-error"));
		mockedFinalizationEnvelope.mockReturnValue(envelope);
		const authResult = { data: { user: { id: "user-synthetic" } }, error: null };
		mockedCreateVercelSupabaseClient.mockReturnValue({
			auth: { getUser: vi.fn().mockResolvedValue(authResult) },
		} as never);

		const express = expressResponse();
		const expressRequest = {
			method: "PATCH",
			url: "/consent-synthetic/sign-artist",
			body: { signature: "signature-synthetic" },
			supabase: { auth: { getUser: vi.fn().mockResolvedValue(authResult) } },
		};
		(consentsRouter as unknown as {
			handle: (request: unknown, response: unknown, next: (error?: unknown) => void) => void;
		}).handle(expressRequest, express.response, (error) => {
			if (error) throw error;
		});
		await express.finished;

		expect(express.result).toMatchObject({ statusCode: 409, body: envelope.body });

		const previousOrigin = process.env.PUBLIC_APP_ORIGIN;
		process.env.PUBLIC_APP_ORIGIN = "https://app.synthetic";
		try {
			const vercel = vercelResponse();
			await vercelSignArtist(
				vercelRequest(
					"PATCH",
					{ signature: "signature-synthetic" },
					"/api/consents/consent-synthetic/sign-artist",
					{ origin: "https://app.synthetic" },
				),
				vercel.response,
			);
			expect(vercel.result).toMatchObject({ statusCode: 409, body: envelope.body });
			expect(vercel.result.headers).toMatchObject({
				"Access-Control-Allow-Origin": "https://app.synthetic",
				Vary: "Origin",
			});

			const foreign = vercelResponse();
			await vercelSignArtist(
				vercelRequest(
					"PATCH",
					{ signature: "signature-synthetic" },
					"/api/consents/consent-synthetic/sign-artist",
					{ origin: "https://foreign.synthetic" },
				),
				foreign.response,
			);
			expect(foreign.result.headers["Access-Control-Allow-Origin"]).toBeUndefined();
		} finally {
			if (previousOrigin === undefined) delete process.env.PUBLIC_APP_ORIGIN;
			else process.env.PUBLIC_APP_ORIGIN = previousOrigin;
		}
	});
});
