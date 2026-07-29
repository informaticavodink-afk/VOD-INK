import { createServiceClient } from "./supabase.js";
import { PublicBoundaryError, resolvePublicStudio } from "./publicStudio.js";

export interface PublicArtist {
	id: string;
	displayName: string;
	qualification: string;
	photoUrl: string | null;
}

export async function listPublicArtists(): Promise<PublicArtist[]> {
	const supabase = createServiceClient();
	const studio = await resolvePublicStudio(supabase);
	const { data, error } = await supabase
		.from("artists")
		.select("id, full_name, qualification, photo_url")
		.eq("studio_id", studio.id)
		.eq("status", "active");

	if (error) throw new Error("No se pudieron cargar los tatuadores públicos");
	return (data ?? []).map((artist) => ({
		id: artist.id,
		displayName: artist.full_name,
		qualification: artist.qualification,
		photoUrl: artist.photo_url,
	}));
}

export async function resolveAvailablePublicArtist(
	supabase: ReturnType<typeof createServiceClient>,
	studioId: string,
	artistId: string,
) {
	const { data, error } = await supabase
		.from("artists")
		.select("id")
		.eq("id", artistId)
		.eq("studio_id", studioId)
		.eq("status", "active")
		.maybeSingle();

	if (error || !data) throw new PublicBoundaryError("ARTIST_NOT_AVAILABLE");
	return data;
}
