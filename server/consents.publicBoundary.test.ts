import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./supabase.js", () => ({ createServiceClient: vi.fn() }));
vi.mock("./drive.js", () => ({ uploadToDrive: vi.fn() }));
vi.mock("../src/lib/pdf.js", () => ({ generateConsentPDF: vi.fn() }));
vi.mock("./consentPdfData.js", () => ({
	buildConsentPdfData: vi.fn(),
	createDocumentSnapshot: vi.fn(),
}));

import { createServiceClient } from "./supabase.js";
import { generateAndSubmitConsent } from "./consents.js";
import type { WizardState } from "../src/types.js";

const mockedCreateServiceClient = vi.mocked(createServiceClient);
const STUDIO_ID = "11111111-1111-4111-8111-111111111111";
const ARTIST_ID = "22222222-2222-4222-8222-222222222222";

function validState(): WizardState {
	return {
		pasoActual: 4,
		artistaSeleccionado: Object.assign(
			{
				id: ARTIST_ID,
				nombreYApellidos: "Artista Sintética",
				titulacion: "Técnica sintética",
			},
			{
				dni: "request-must-not-be-authoritative",
				carpetaDriveId: "request-must-not-be-authoritative",
			},
		),
		datosCliente: {
			nombreYApellidos: "Cliente Sintética",
			dni: "12345678Z",
			fechaNacimiento: "1990-03-04",
			domicilio: "Calle Sintética 1",
			cp: "39001",
			localidad: "Santander",
			telefono: "600000001",
		},
		esMenor: false,
		datosRepresentante: {
			nombreYApellidos: "",
			dni: "",
			fechaNacimiento: "",
			domicilio: "",
			cp: "",
			localidad: "",
			telefono: "",
			parentesco: "",
			acreditaMediante: "",
		},
		datosTecnica: {
			denominacionGenerica: "",
			localizacionAnatomica: "",
			tintas: [],
			otrosMateriales: "",
			duracion: "",
			posibilidadesEliminacion: "",
			presupuesto: "",
		},
		declaracionLeido: true,
		declaracionContraindicaciones: true,
		declaracionSaludSeleccionadas: [],
		confirmadoPrecio: true,
		firmaCliente: "data:image/png;base64,iVBORw0KGgoSYNTHETIC",
		firmaAplicador: "",
		lugar: "Santander",
		fecha: "28/07/2026",
	};
}

function consentClient(options: {
	artist: { id: string; studio_id: string; status: "active" | "paused" } | null;
	existing?: {
		id: string;
		status: string;
		final_file_id: string | null;
	} | null;
}) {
	const studioQuery = {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		limit: vi
			.fn()
			.mockResolvedValue({ data: [{ id: STUDIO_ID }], error: null }),
	};
	const artistEq = vi.fn().mockReturnThis();
	const artistQuery = {
		select: vi.fn().mockReturnThis(),
		eq: artistEq,
		single: vi
			.fn()
			.mockResolvedValue({
				data: options.artist,
				error: options.artist ? null : { message: "not found" },
			}),
		maybeSingle: vi.fn().mockImplementation(async () => {
			const filters = artistEq.mock.calls;
			const available =
				options.artist?.status === "active" &&
				filters.some(
					([key, value]) => key === "id" && value === options.artist?.id,
				) &&
				filters.some(
					([key, value]) =>
						key === "studio_id" && value === options.artist?.studio_id,
				) &&
				filters.some(([key, value]) => key === "status" && value === "active");
			return {
				data: available ? { id: options.artist!.id } : null,
				error: null,
			};
		}),
	};
	const existingEq = vi.fn().mockReturnThis();
	const existingQuery = {
		eq: existingEq,
		maybeSingle: vi
			.fn()
			.mockResolvedValue({ data: options.existing ?? null, error: null }),
	};
	const insertSingle = vi
		.fn()
		.mockResolvedValue({
			data: { id: "33333333-3333-4333-8333-333333333333" },
			error: null,
		});
	const insertSelect = vi.fn().mockReturnValue({ single: insertSingle });
	const insert = vi.fn().mockReturnValue({ select: insertSelect });
	const consentsTable = {
		select: vi.fn().mockReturnValue(existingQuery),
		insert,
		delete: vi
			.fn()
			.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
	};
	const signaturesTable = {
		upsert: vi.fn().mockResolvedValue({ error: null }),
	};
	const client = {
		from: vi.fn((table: string) => {
			if (table === "studios") return studioQuery;
			if (table === "artists") return artistQuery;
			if (table === "consents") return consentsTable;
			return signaturesTable;
		}),
	};
	mockedCreateServiceClient.mockReturnValue(client as never);
	return { artistEq, existingEq, insert, signaturesTable };
}

describe("public consent studio boundary", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.PUBLIC_STUDIO_SLUG = "synthetic-studio";
	});

	it.each([
		[
			"inactive",
			{ id: ARTIST_ID, studio_id: STUDIO_ID, status: "paused" as const },
		],
		[
			"cross-studio",
			{
				id: ARTIST_ID,
				studio_id: "99999999-9999-4999-8999-999999999999",
				status: "active" as const,
			},
		],
		["unknown", null],
	])("rejects an %s artist before consent insertion", async (_label, artist) => {
		const { insert, signaturesTable } = consentClient({ artist });

		await expect(
			generateAndSubmitConsent(validState(), "synthetic-key"),
		).rejects.toMatchObject({
			code: "ARTIST_NOT_AVAILABLE",
			status: 422,
			retryable: false,
		});
		expect(insert).not.toHaveBeenCalled();
		expect(signaturesTable.upsert).not.toHaveBeenCalled();
	});

	it("ignores request-supplied tenant fields and inserts only the resolved studio", async () => {
		const state = Object.assign(validState(), {
			studio_id: "99999999-9999-4999-8999-999999999999",
			studioSlug: "browser-controlled",
		});
		const { artistEq, insert } = consentClient({
			artist: { id: ARTIST_ID, studio_id: STUDIO_ID, status: "active" },
		});

		await generateAndSubmitConsent(state, "synthetic-key");

		expect(artistEq.mock.calls).toEqual(
			expect.arrayContaining([
				["id", ARTIST_ID],
				["studio_id", STUDIO_ID],
				["status", "active"],
			]),
		);
		expect(insert).toHaveBeenCalledWith(
			expect.objectContaining({
				studio_id: STUDIO_ID,
				artist_id: ARTIST_ID,
			}),
		);
	});

	it("scopes idempotency lookup to the resolved studio", async () => {
		const { existingEq, insert, signaturesTable } = consentClient({
			artist: { id: ARTIST_ID, studio_id: STUDIO_ID, status: "active" },
			existing: {
				id: "existing-consent",
				status: "pending_technique",
				final_file_id: null,
			},
		});

		await expect(
			generateAndSubmitConsent(validState(), "same-key"),
		).resolves.toMatchObject({
			consentId: "existing-consent",
			status: "pending_technique",
		});
		expect(existingEq.mock.calls).toEqual([
			["studio_id", STUDIO_ID],
			["idempotency_key", "same-key"],
		]);
		expect(insert).not.toHaveBeenCalled();
		expect(signaturesTable.upsert).not.toHaveBeenCalled();
	});
});
