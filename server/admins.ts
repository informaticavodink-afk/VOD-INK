import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Organization = Database['public']['Tables']['organizations']['Row'];
type OrgRole = Database['public']['Enums']['organization_role'];
type PlatformRole = Database['public']['Enums']['platform_role'];

export type AdminPayload = {
  full_name?: string;
  email?: string;
  password?: string;
  organization_id?: string;
  organization_role?: OrgRole;
  platform_role?: PlatformRole;
};

export function normalizeEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Error interno del servidor';
}

function assertPassword(password: string | undefined) {
  if (!password || password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }
}

function assertPayload(payload: AdminPayload) {
  if (!payload.full_name?.trim()) throw new Error('Falta el nombre del administrador');
  if (!normalizeEmail(payload.email)) throw new Error('Falta el correo del administrador');
  if (!payload.organization_id?.trim()) throw new Error('Falta la empresa del administrador');
  assertPassword(payload.password);
}

export async function assertCurrentUserIsSuperAdmin(
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

  if (profile.platform_role !== 'super_admin') {
    throw new Error('Solo un super admin puede crear administradores');
  }

  return profile;
}

async function getOrganization(
  organizationId: string,
  serviceClient: SupabaseClient<Database>
): Promise<Organization> {
  const { data: organization, error } = await serviceClient
    .from('organizations')
    .select('*')
    .eq('id', organizationId)
    .single();

  if (error || !organization) {
    throw new Error('Empresa no encontrada');
  }

  const { data: studio } = await serviceClient
    .from('studios')
    .select('id')
    .eq('id', organization.id)
    .single();

  if (!studio) {
    throw new Error('Esta empresa no tiene estudio asociado para el panel legacy');
  }

  return organization;
}

export async function createAdminUser(
  payload: AdminPayload,
  serviceClient: SupabaseClient<Database>
) {
  assertPayload(payload);

  const fullName = payload.full_name!.trim();
  const email = normalizeEmail(payload.email)!;
  const organization = await getOrganization(payload.organization_id!.trim(), serviceClient);
  const organizationRole: OrgRole = payload.organization_role || 'admin';
  const platformRole: PlatformRole = payload.platform_role || 'user';

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

  try {
    const { data: profile, error: profileError } = await serviceClient
      .from('profiles')
      .insert({
        user_id: userData.user.id,
        studio_id: organization.id,
        role: 'owner',
        full_name: fullName,
        platform_role: platformRole,
      })
      .select('*')
      .single();

    if (profileError || !profile) {
      throw new Error(profileError?.message || 'No se pudo crear el perfil del administrador');
    }

    const { data: membership, error: membershipError } = await serviceClient
      .from('organization_memberships')
      .insert({
        organization_id: organization.id,
        user_id: profile.id,
        role: organizationRole,
        status: 'active',
      })
      .select('*')
      .single();

    if (membershipError || !membership) {
      throw new Error(membershipError?.message || 'No se pudo crear la membresía del administrador');
    }

    return { user: userData.user, profile, membership, organization };
  } catch (error) {
    await serviceClient.auth.admin.deleteUser(userData.user.id);
    throw error;
  }
}
