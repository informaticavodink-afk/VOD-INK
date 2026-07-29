import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchActiveArtists } from "./artists.js";

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
	vi.restoreAllMocks();
});

describe("public artist browser mapping", () => {
	it("uses the stable root API endpoint and maps display fields without tenant authority", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					artists: [
						{
							id: "22222222-2222-4222-8222-222222222222",
							displayName: "Artista Sintética",
							qualification: "Técnica sintética",
							photoUrl: null,
						},
					],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);
		globalThis.fetch = fetchMock;

		await expect(fetchActiveArtists()).resolves.toEqual([
			{
				id: "22222222-2222-4222-8222-222222222222",
				nombreYApellidos: "Artista Sintética",
				titulacion: "Técnica sintética",
				fotoUrl: undefined,
			},
		]);
		expect(fetchMock).toHaveBeenCalledWith("/api/public/artists", {
			headers: { Accept: "application/json" },
		});
	});

	it("ignores legacy RPC and internal columns in an endpoint response", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					artists: [
						{
							id: "44444444-4444-4444-8444-444444444444",
							displayName: "Artista de Compatibilidad",
							qualification: "Cualificación sintética",
							photoUrl: "https://images.example/compat.webp",
							full_name: "legacy",
							dni: "forbidden",
							studio_id: "forbidden",
							drive_folder_id: "forbidden",
							phone: "forbidden",
							document_metadata: "forbidden",
						},
					],
				}),
				{ status: 200, headers: { "Content-Type": "application/json" } },
			),
		);

		const [artist] = await fetchActiveArtists();

		expect(artist).toEqual({
			id: "44444444-4444-4444-8444-444444444444",
			nombreYApellidos: "Artista de Compatibilidad",
			titulacion: "Cualificación sintética",
			fotoUrl: "https://images.example/compat.webp",
		});
		expect(Object.keys(artist).sort()).toEqual([
			"fotoUrl",
			"id",
			"nombreYApellidos",
			"titulacion",
		]);
	});

	it("surfaces the stable API error message", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					error: {
						code: "PUBLIC_STUDIO_CONTEXT_INVALID",
						message: "El estudio público no está disponible.",
						retryable: false,
					},
				}),
				{ status: 503, headers: { "Content-Type": "application/json" } },
			),
		);

		await expect(fetchActiveArtists()).rejects.toThrow(
			"El estudio público no está disponible.",
		);
	});
});
