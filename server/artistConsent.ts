import { ConsentTechniqueSchema } from '../src/domain/consents/consentPdfSchema.js';
import { createServiceClient } from './supabase.js';

export async function getArtistConsentForUser(consentId: string, actorUserId: string) {
  const supabase = createServiceClient();
  const { data: consent, error: consentError } = await supabase
    .from('consents')
    .select('*')
    .eq('id', consentId)
    .single();

  if (consentError || !consent) throw new Error('Consentimiento no encontrado');

  const { data: artist, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .eq('id', consent.artist_id)
    .single();

  if (artistError || !artist?.profile_id) throw new Error('Tatuador no encontrado');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_id, role')
    .eq('id', artist.profile_id)
    .single();

  if (profileError || !profile || profile.user_id !== actorUserId || profile.role !== 'artist') {
    throw new Error('No tienes permisos para gestionar este consentimiento');
  }

  return { supabase, consent, artist };
}

export async function saveConsentTechnique(
  consentId: string,
  techniqueData: unknown,
  actorUserId: string,
): Promise<{ success: boolean; status: string }> {
  const { supabase, consent } = await getArtistConsentForUser(consentId, actorUserId);

  if (consent.status !== 'pending_technique') {
    throw new Error('Este consentimiento no está pendiente de intervención');
  }

  const validatedTechnique = ConsentTechniqueSchema.parse(techniqueData);
  const { error } = await supabase
    .from('consents')
    .update({ technique_data: validatedTechnique, status: 'pending_artist' })
    .eq('id', consentId);

  if (error) {
    throw new Error(`Error al guardar los datos de intervención: ${error.message}`);
  }

  return { success: true, status: 'pending_artist' };
}
