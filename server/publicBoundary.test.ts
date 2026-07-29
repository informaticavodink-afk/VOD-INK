import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./supabase.js", () => ({ createServiceClient: vi.fn() }));

import { createServiceClient } from "./supabase.js";
import { listPublicArtists } from "./publicArtists.js";
import { resolvePublicStudio } from "./publicStudio.js";

const mockedCreateServiceClient = vi.mocked(createServiceClient);
const ORIGINAL_SLUG = process.env.PUBLIC_STUDIO_SLUG;

function serviceClient(studios: unknown[], artists: unknown[] = []) {
	const studioLimit = vi.fn().mockResolvedValue({ data: studios, error: null });
	const studioQuery = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		limit: studioLimit,
	};
	const artistStatus = vi
		.fn()
		.mockResolvedValue({ data: artists, error: null });
	const artistQuery = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockImplementation((_column: string) => {
			if (_column === "status") return artistStatus();
			return artistQuery;
		}),
	};
	const rpc = vi.fn();
	const client = {
		from: vi.fn((table: string) =>
			table === "studios" ? studioQuery : artistQuery,
		),
		rpc,
	};
	mockedCreateServiceClient.mockReturnValue(client as never);
	return { client, studioQuery, artistQuery, rpc };
}

describe("trusted public studio and artist discovery", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		delete process.env.PUBLIC_STUDIO_SLUG;
	});

	afterEach(() => {
		if (ORIGINAL_SLUG === undefined) delete process.env.PUBLIC_STUDIO_SLUG;
		else process.env.PUBLIC_STUDIO_SLUG = ORIGINAL_SLUG;
	});

	it.each([
		undefined,
		"",
		"   ",
	])("rejects missing or blank server context (%s) before creating a client", async (slug) => {
		if (slug !== undefined) process.env.PUBLIC_STUDIO_SLUG = slug;

		await expect(resolvePublicStudio()).rejects.toMatchObject({
			code: "PUBLIC_STUDIO_CONTEXT_INVALID",
			status: 503,
			retryable: false,
		});
		expect(mockedCreateServiceClient).not.toHaveBeenCalled();
	});

	it.each([
		["zero", []],
		["multiple", [{ id: "studio-a" }, { id: "studio-b" }]],
	])("rejects %s matching studios", async (_label, studios) => {
		process.env.PUBLIC_STUDIO_SLUG = "synthetic-studio";
		serviceClient(studios);

		await expect(resolvePublicStudio()).rejects.toMatchObject({
			code: "PUBLIC_STUDIO_CONTEXT_INVALID",
			status: 503,
			retryable: false,
		});
	});

	it("queries active artists directly and returns the exact four-key allowlist", async () => {
		process.env.PUBLIC_STUDIO_SLUG = "synthetic-studio";
		const { artistQuery, rpc } = serviceClient(
			[{ id: "11111111-1111-4111-8111-111111111111" }],
			[
				{
					id: "22222222-2222-4222-8222-222222222222",
					full_name: "Artista Sintética",
					qualification: "Técnica sintética",
					photo_url: null,
					dni: "forbidden",
					studio_id: "forbidden",
					drive_folder_id: "forbidden",
					phone: "forbidden",
				},
			],
		);

		await expect(listPublicArtists()).resolves.toEqual([
			{
				id: "22222222-2222-4222-8222-222222222222",
				displayName: "Artista Sintética",
				qualification: "Técnica sintética",
				photoUrl: null,
			},
		]);
		expect(artistQuery.select).toHaveBeenCalledWith(
			"id, full_name, qualification, photo_url",
		);
		expect(artistQuery.eq).toHaveBeenCalledWith(
			"studio_id",
			"11111111-1111-4111-8111-111111111111",
		);
		expect(artistQuery.eq).toHaveBeenCalledWith("status", "active");
		expect(rpc).not.toHaveBeenCalled();
	});

	it("strips every legacy/internal database column and preserves an optional photo", async () => {
		process.env.PUBLIC_STUDIO_SLUG = "synthetic-studio";
		serviceClient(
			[{ id: "11111111-1111-4111-8111-111111111111" }],
			[
				{
					id: "33333333-3333-4333-8333-333333333333",
					full_name: "Segunda Artista Sintética",
					qualification: "Cualificación pública",
					photo_url: "https://images.example/synthetic.webp",
					dni: "forbidden",
					tax_id: "forbidden",
					studio_id: "forbidden",
					drive_folder_id: "forbidden",
					phone: "forbidden",
					document_metadata: { forbidden: true },
				},
			],
		);

		const [artist] = await listPublicArtists();

		expect(artist).toEqual({
			id: "33333333-3333-4333-8333-333333333333",
			displayName: "Segunda Artista Sintética",
			qualification: "Cualificación pública",
			photoUrl: "https://images.example/synthetic.webp",
		});
		expect(Object.keys(artist).sort()).toEqual([
			"displayName",
			"id",
			"photoUrl",
			"qualification",
		]);
	});
});
