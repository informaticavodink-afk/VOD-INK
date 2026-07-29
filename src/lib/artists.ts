/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Aplicador } from "../types";

interface PublicArtistResponse {
	id: string;
	displayName: string;
	qualification: string;
	photoUrl: string | null;
}

function mapPublicArtistToAplicador(artist: PublicArtistResponse): Aplicador {
	return {
		id: artist.id,
		nombreYApellidos: artist.displayName,
		titulacion: artist.qualification,
		fotoUrl: artist.photoUrl || undefined,
	};
}

export async function fetchActiveArtists(): Promise<Aplicador[]> {
	const response = await fetch("/api/public/artists", {
		headers: { Accept: "application/json" },
	});

	if (!response.ok) {
		const body = await response.json();
		const message = body?.error?.message ?? "Error al cargar tatuadores";
		throw new Error(message);
	}

	const body = await response.json();
	return (body.artists ?? []).map(mapPublicArtistToAplicador);
}
