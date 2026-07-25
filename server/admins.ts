import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/supabase.js';

type Profile = Database['public']['Tables']['profiles']['Row'];

export type AdminPayload = {
  full_name?: string;
  email?: string;
  password?: string;
};

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Error interno del servidor';
}

function normalizeEmail(email: string | undefined) {
  return email?.trim().toLowerCase() || null;
}

function assertPayload(payload: AdminPayload) {
  if (!payload.full_name?.trim()) throw new Error('Falta el nombre del administrador');
  if (!normalizeEmail(payload.email)) throw new Error('Falta el correo del administrador');
  if (!payload.password || payload.password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }
}

export async function getCurrentManagerProfile(
  authClient: SupabaseClient<Database>,
  serviceClient: SupabaseClient<Database>
): Promise<Profile> {
  const { data: authData, error: authError } = await authClient.auth.getUser();

  if (authError || !authData.user) {
    throw new Error('No autenticado');
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('user_id', authData.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('No se encontró el perfil del usuario autenticado');
  }

  if (profile.role !== 'owner' && profile.role !== 'admin') {
    throw new Error('No tienes permisos para gestionar usuarios');
  }

  return profile;
}

export async function createAdminUser(
  managerProfile: Profile,
  payload: AdminPayload,
  serviceClient: SupabaseClient<Database>
) {
  assertPayload(payload);

  const fullName = payload.full_name!.trim();
  const email = normalizeEmail(payload.email)!;

  const { data: userData, error: userError } = await serviceClient.auth.admin.createUser({
    email,
    password: payload.password!,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: 'admin',
    },
  });

  if (userError || !userData.user) {
    throw new Error(userError?.message || 'No se pudo crear el usuario administrador');
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .insert({
      user_id: userData.user.id,
      studio_id: managerProfile.studio_id,
      role: 'admin',
      full_name: fullName,
    })
    .select('*')
    .single();

  if (profileError || !profile) {
    await serviceClient.auth.admin.deleteUser(userData.user.id);
    throw new Error(profileError?.message || 'No se pudo crear el perfil del administrador');
  }

  return { user: userData.user, profile };
}
