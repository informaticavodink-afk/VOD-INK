import type { Database } from '../../types/supabase';

type ConsentStatus = Database['public']['Enums']['consent_status'];

export function shouldPersistTechnique(status: ConsentStatus) {
  return status === 'pending_technique';
}

export function canAttemptFinalSignature(status: ConsentStatus) {
  return status === 'pending_artist' || status === 'upload_error';
}
