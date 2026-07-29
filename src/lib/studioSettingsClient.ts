import type { Database } from '@/src/types/supabase';

export type Studio = Database['public']['Tables']['studios']['Row'];

export type StudioForm = {
  legal_name: string;
  trade_name: string;
  tax_id: string;
  address: string;
  city: string;
  postal_code: string;
  phone: string;
  health_registration_number: string;
  health_authorization_date: string;
};

export const EMPTY_STUDIO_FORM: StudioForm = {
  legal_name: '',
  trade_name: '',
  tax_id: '',
  address: '',
  city: '',
  postal_code: '',
  phone: '',
  health_registration_number: '',
  health_authorization_date: '',
};

export function studioToForm(studio: Studio): StudioForm {
  return {
    legal_name: studio.legal_name,
    trade_name: studio.trade_name,
    tax_id: studio.tax_id ?? '',
    address: studio.address ?? '',
    city: studio.city ?? '',
    postal_code: studio.postal_code ?? '',
    phone: studio.phone ?? '',
    health_registration_number: studio.health_registration_number ?? '',
    health_authorization_date: studio.health_authorization_date ?? '',
  };
}

export async function getStudioSettingsError(response: Response) {
  const payload = await response.json().catch(() => null);
  return payload?.error || 'No se pudieron guardar los datos del estudio.';
}

export function todayInMadrid() {
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
