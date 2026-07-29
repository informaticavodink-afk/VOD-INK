import { createServiceClient } from "./supabase.js";

export type PublicBoundaryErrorCode =
	| "PUBLIC_STUDIO_CONTEXT_INVALID"
	| "ARTIST_NOT_AVAILABLE";

const ERROR_DEFINITIONS = {
	PUBLIC_STUDIO_CONTEXT_INVALID: {
		status: 503,
		message: "El estudio público no está disponible.",
	},
	ARTIST_NOT_AVAILABLE: {
		status: 422,
		message: "El tatuador seleccionado no está disponible.",
	},
} as const;

export class PublicBoundaryError extends Error {
	readonly status: number;
	readonly retryable = false;

	constructor(readonly code: PublicBoundaryErrorCode) {
		const definition = ERROR_DEFINITIONS[code];
		super(definition.message);
		this.name = "PublicBoundaryError";
		this.status = definition.status;
	}
}

export function toPublicBoundaryErrorEnvelope(error: unknown) {
	if (!(error instanceof PublicBoundaryError)) return null;
	return {
		status: error.status,
		body: {
			error: {
				code: error.code,
				message: error.message,
				retryable: error.retryable,
			},
		},
	};
}

export async function resolvePublicStudio(
	client?: ReturnType<typeof createServiceClient>,
) {
	const slug = process.env.PUBLIC_STUDIO_SLUG?.trim();
	if (!slug) throw new PublicBoundaryError("PUBLIC_STUDIO_CONTEXT_INVALID");

	const supabase = client ?? createServiceClient();
	const { data, error } = await supabase
		.from("studios")
		.select("id")
		.eq("slug", slug)
		.limit(2);

	if (error || data?.length !== 1) {
		throw new PublicBoundaryError("PUBLIC_STUDIO_CONTEXT_INVALID");
	}
	return data[0];
}
