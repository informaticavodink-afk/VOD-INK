import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/supabase.js';

type Profile = Database['public']['Tables']['profiles']['Row'];
export type StudioSettings = Database['public']['Tables']['studios']['Row'];

export type StudioSettingsPayload = {
  legal_name?: unknown;
  trade_name?: unknown;
  tax_id?: unknown;
  address?: unknown;
  city?: unknown;
  postal_code?: unknown;
  phone?: unknown;
  health_registration_number?: unknown;
  health_authorization_date?: unknown;
  attest_health_data?: unknown;
};

const DEMO_HEALTH_REGISTRATION = 'SAN/07/2024-C';
const DEMO_HEALTH_DATE = '2024-06-15';

function todayInMadrid() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function requiredText(value: unknown, label: string, maxLength: number) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Falta ${label}`);
  }

  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new Error(`${label} supera el máximo de ${maxLength} caracteres`);
  }
  return normalized;
}

function optionalText(value: unknown, label: string, maxLength: number) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`${label} no es válido`);

  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new Error(`${label} supera el máximo de ${maxLength} caracteres`);
  }
  return normalized;
}

function authorizationDate(value: unknown) {
  const normalized = optionalText(value, 'la fecha de autorización sanitaria', 10);
  if (!normalized) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error('La fecha de autorización sanitaria no es válida');
  }

  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new Error('La fecha de autorización sanitaria no es válida');
  }

  const today = todayInMadrid();
  if (normalized > today) {
    throw new Error('La fecha de autorización sanitaria no puede ser futura');
  }
  return normalized;
}

export function parseStudioSettingsPayload(payload: StudioSettingsPayload) {
  const healthRegistration = optionalText(
    payload.health_registration_number,
    'el número de registro sanitario',
    120
  );
  const healthDate = authorizationDate(payload.health_authorization_date);

  if (Boolean(healthRegistration) !== Boolean(healthDate)) {
    throw new Error('El registro sanitario y su fecha de autorización deben completarse juntos');
  }

  if (healthRegistration === DEMO_HEALTH_REGISTRATION && healthDate === DEMO_HEALTH_DATE) {
    throw new Error('Los datos sanitarios de demostración no son válidos');
  }

  const attestHealthData = payload.attest_health_data === true;
  if (attestHealthData && (!healthRegistration || !healthDate)) {
    throw new Error('Completa los datos sanitarios antes de confirmarlos');
  }

  return {
    legal_name: requiredText(payload.legal_name, 'la razón social', 160),
    trade_name: requiredText(payload.trade_name, 'el nombre comercial', 160),
    tax_id: requiredText(payload.tax_id, 'el CIF/NIF', 40),
    address: requiredText(payload.address, 'el domicilio', 240),
    city: requiredText(payload.city, 'la localidad', 120),
    postal_code: requiredText(payload.postal_code, 'el código postal', 20),
    phone: requiredText(payload.phone, 'el teléfono', 40),
    health_registration_number: healthRegistration,
    health_authorization_date: healthDate,
    attest_health_data: attestHealthData,
  };
}

export async function getStudioSettings(
  managerProfile: Profile,
  serviceClient: SupabaseClient<Database>
): Promise<StudioSettings> {
  const { data, error } = await serviceClient
    .from('studios')
    .select('*')
    .eq('id', managerProfile.studio_id)
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'No se encontró el estudio');
  }
  return data;
}

export async function updateStudioSettings(
  managerProfile: Profile,
  payload: StudioSettingsPayload,
  serviceClient: SupabaseClient<Database>
): Promise<StudioSettings> {
  const input = parseStudioSettingsPayload(payload);
  const { data, error } = await serviceClient.rpc('update_studio_settings_as_manager', {
    p_actor_profile_id: managerProfile.id,
    p_studio_id: managerProfile.studio_id,
    p_legal_name: input.legal_name,
    p_trade_name: input.trade_name,
    p_tax_id: input.tax_id,
    p_address: input.address,
    p_city: input.city,
    p_postal_code: input.postal_code,
    p_phone: input.phone,
    p_health_registration_number: input.health_registration_number,
    p_health_authorization_date: input.health_authorization_date,
    p_attest_health_data: input.attest_health_data,
  });

  if (error || !data) {
    throw new Error(error?.message || 'No se pudo actualizar el estudio');
  }
  return data;
}
