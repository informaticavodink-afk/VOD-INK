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
  };
}

export async function getStudioSettingsError(response: Response) {
  const payload = await response.json().catch(() => null);
  return payload?.error || 'No se pudieron guardar los datos del estudio.';
}

export async function fetchStudioSettings() {
  const response = await fetch('/api/studio-settings');
  if (!response.ok) throw new Error(await getStudioSettingsError(response));
  const payload = await response.json();
  return payload.studio as Studio;
}

export async function saveStudioSettings(form: StudioForm, attestHealthData: boolean) {
  const response = await fetch('/api/studio-settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...form,
      attest_health_data: attestHealthData,
    }),
  });
  if (!response.ok) throw new Error(await getStudioSettingsError(response));
  const payload = await response.json();
  return payload.studio as Studio;
}
