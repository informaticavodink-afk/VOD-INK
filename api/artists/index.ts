import type { IncomingMessage, ServerResponse } from 'http';
import { createServiceClient } from '../../server/supabase.js';
import { createVercelSupabaseClient } from '../../utils/supabase/vercel.js';
import { parseBody } from '../_lib/parseBody.js';
import type { Database } from '../../src/types/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

type Profile = Database['public']['Tables']['profiles']['Row'];

type ArtistPayload = {
  full_name?: string;
  dni?: string;
  qualification?: string;
  login_email?: string | null;
  password?: string;
  photo_url?: string | null;
  drive_folder_id?: string | null;
  status?: Database['public']['Enums']['artist_status'];
};

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.setHeader('Content-Type', 'application/json');
  res.statusCode = status;
  res.end(JSON.stringify(data));
}

function normalizeEmail(email: string | null | undefined) {
  const normalized = email?.trim().toLowerCase();
  return normalized || null;
}

function normalizeOptionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized || null;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Error interno del servidor';
}

async function getOwnerProfile(supabase: SupabaseClient<Database>): Promise<Profile> {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error('No autenticado');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', authData.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('No se encontró el perfil del usuario autenticado');
  }

  if (profile.role !== 'owner' && profile.role !== 'admin') {
    throw new Error('No tienes permisos para gestionar tatuadores');
  }

  return profile;
}

function assertRequiredArtistFields(payload: ArtistPayload) {
  if (!payload.full_name?.trim()) throw new Error('Falta el nombre del tatuador');
  if (!payload.dni?.trim()) throw new Error('Falta el DNI/NIE del tatuador');
  if (!payload.qualification?.trim()) throw new Error('Falta la licencia o titulación del tatuador');
}

function assertPassword(password: string | undefined) {
  if (!password || password.length < 6) {
    throw new Error('La contraseña del tatuador debe tener al menos 6 caracteres');
  }
}

async function createArtistAuthIdentity(
  ownerProfile: Profile,
  payload: ArtistPayload,
  serviceClient: ReturnType<typeof createServiceClient>
) {
  const loginEmail = normalizeEmail(payload.login_email);
  if (!loginEmail) throw new Error('Falta el email de acceso del tatuador');
  assertPassword(payload.password);

  const { data: userData, error: userError } = await serviceClient.auth.admin.createUser({
    email: loginEmail,
    password: payload.password,
    email_confirm: true,
    user_metadata: {
      full_name: payload.full_name?.trim(),
      role: 'artist',
    },
  });

  if (userError || !userData.user) {
    throw new Error(userError?.message || 'No se pudo crear el usuario del tatuador');
  }

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .insert({
      user_id: userData.user.id,
      studio_id: ownerProfile.studio_id,
      role: 'artist',
      full_name: payload.full_name!.trim(),
    })
    .select('*')
    .single();

  if (profileError || !profile) {
    await serviceClient.auth.admin.deleteUser(userData.user.id);
    throw new Error(profileError?.message || 'No se pudo crear el perfil del tatuador');
  }

  return { userId: userData.user.id, profile };
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  try {
    const userSupabase = createVercelSupabaseClient(req, res);
    const ownerProfile = await getOwnerProfile(userSupabase);
    const payload = await parseBody<ArtistPayload>(req);
    assertRequiredArtistFields(payload);

    const serviceClient = createServiceClient();
    const login = await createArtistAuthIdentity(ownerProfile, payload, serviceClient);
    const loginEmail = normalizeEmail(payload.login_email);

    const { data: artist, error: artistError } = await serviceClient
      .from('artists')
      .insert({
        studio_id: ownerProfile.studio_id,
        profile_id: login.profile.id,
        full_name: payload.full_name!.trim(),
        dni: payload.dni!.trim(),
        qualification: payload.qualification!.trim(),
        login_email: loginEmail,
        photo_url: normalizeOptionalText(payload.photo_url),
        drive_folder_id: normalizeOptionalText(payload.drive_folder_id),
        status: payload.status || 'active',
      })
      .select('*')
      .single();

    if (artistError || !artist) {
      await serviceClient.auth.admin.deleteUser(login.userId);
      throw new Error(artistError?.message || 'No se pudo crear el tatuador');
    }

    sendJson(res, 201, { artist });
  } catch (error) {
    const message = getErrorMessage(error);
    const status =
      message === 'No autenticado' ? 401 : message.includes('permisos') ? 403 : 400;
    console.error(`[api/artists] ${req.method} ${req.url} failed:`, error);
    sendJson(res, status, { error: message });
  }
}
