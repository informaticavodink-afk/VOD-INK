/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@/utils/supabase/client';
import type { Aplicador } from '../types';

const STUDIO_SLUG = 'vod-ink';

export function mapSupabaseArtistToAplicador(artist: {
  id: string;
  full_name: string;
  qualification: string;
  dni: string;
  photo_url: string | null;
  drive_folder_id: string | null;
}): Aplicador {
  return {
    id: artist.id,
    nombreYApellidos: artist.full_name,
    titulacion: artist.qualification,
    dni: artist.dni,
    fotoUrl: artist.photo_url || undefined,
    carpetaDriveId: artist.drive_folder_id || '',
  };
}

export async function fetchActiveArtists(): Promise<Aplicador[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc('get_active_artists', {
    studio_slug: STUDIO_SLUG,
  });

  if (error) {
    throw new Error(`Error al cargar tatuadores: ${error.message}`);
  }

  return (data || []).map(mapSupabaseArtistToAplicador);
}
