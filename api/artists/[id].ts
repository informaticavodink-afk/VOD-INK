import type { IncomingMessage, ServerResponse } from 'http';
import { createServiceClient } from '../../server/supabase.js';
import { createVercelSupabaseClient } from '../../utils/supabase/vercel.js';
import { parseBody } from '../_lib/parseBody.js';
import type { Database } from '../../src/types/supabase.js';
import type { SupabaseClient } from '@supabase/supabase-js';

type Artist = Database['public']['Tables']['artists']['Row'];
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

function setCorsHeaders(res: ServerResponse, methods: string) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', `${methods}, OPTIONS`);
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

function getIdFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  // Path pattern: /api/artists/<id>  (with optional query string)
  const match = url.match(/\/api\/artists\/([^/?]+)/);
  return match ? match[1] : null;
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

async function getArtistForOwner(
  artistId: string,
  ownerProfile: Profile,
  serviceClient: ReturnType<typeof createServiceClient>
) {
  const { data: artist, error } = await serviceClient
    .from('artists')
    .select('*')
    .eq('id', artistId)
    .single();

  if (error || !artist) {
    throw new Error('Tatuador no encontrado');
  }

  if (artist.studio_id !== ownerProfile.studio_id) {
    throw new Error('No puedes modificar tatuadores de otro estudio');
  }

  return artist;
}

async function getProfileForArtist(
  artist: Artist,
  serviceClient: ReturnType<typeof createServiceClient>
) {
  if (!artist.profile_id) return null;

  const { data: profile, error } = await serviceClient
    .from('profiles')
    .select('*')
    .eq('id', artist.profile_id)
    .single();

  if (error || !profile) {
    throw new Error('El tatuador tiene un perfil vinculado inválido');
  }

  return profile;
}

async function handlePatch(
  id: string,
  req: IncomingMessage,
  res: ServerResponse,
  userSupabase: SupabaseClient<Database>
) {
  const ownerProfile = await getOwnerProfile(userSupabase);
  const payload = await parseBody<ArtistPayload>(req);
  assertRequiredArtistFields(payload);

  const serviceClient = createServiceClient();
  const artist = await getArtistForOwner(id, ownerProfile, serviceClient);
  let profile = await getProfileForArtist(artist, serviceClient);
  let profileId = artist.profile_id;
  const loginEmail = normalizeEmail(payload.login_email);

  // Was the Supabase Auth identity just created in this same request? If so,
  // createArtistAuthIdentity already set the email/password on creation —
  // re-applying them via updateUserById right after is redundant and can
  // trip Supabase Auth's own "email already registered" check against the
  // user it just created.
  let justCreatedIdentity = false;

  if (!profile && (loginEmail || payload.password)) {
    const createdLogin = await createArtistAuthIdentity(ownerProfile, payload, serviceClient);
    profile = createdLogin.profile;
    profileId = createdLogin.profile.id;
    justCreatedIdentity = true;
  }

  if (profile && !justCreatedIdentity) {
    const authUpdates: { email?: string; password?: string; email_confirm?: boolean } = {};

    if (loginEmail && loginEmail !== artist.login_email) {
      authUpdates.email = loginEmail;
      authUpdates.email_confirm = true;
    }

    if (payload.password) {
      assertPassword(payload.password);
      authUpdates.password = payload.password;
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: userUpdateError } = await serviceClient.auth.admin.updateUserById(
        profile.user_id,
        authUpdates
      );

      if (userUpdateError) {
        throw new Error(userUpdateError.message);
      }
    }

    const { error: profileUpdateError } = await serviceClient
      .from('profiles')
      .update({ full_name: payload.full_name!.trim() })
      .eq('id', profile.id);

    if (profileUpdateError) {
      throw new Error(profileUpdateError.message);
    }
  }

  const { data: updatedArtist, error: artistUpdateError } = await serviceClient
    .from('artists')
    .update({
      profile_id: profileId,
      full_name: payload.full_name!.trim(),
      dni: payload.dni!.trim(),
      qualification: payload.qualification!.trim(),
      login_email: loginEmail,
      photo_url: normalizeOptionalText(payload.photo_url),
      drive_folder_id: normalizeOptionalText(payload.drive_folder_id),
      status: payload.status || artist.status,
    })
    .eq('id', artist.id)
    .select('*')
    .single();

  if (artistUpdateError || !updatedArtist) {
    throw new Error(artistUpdateError?.message || 'No se pudo actualizar el tatuador');
  }

  sendJson(res, 200, { artist: updatedArtist });
}

async function handleDelete(
  id: string,
  res: ServerResponse,
  userSupabase: SupabaseClient<Database>
) {
  const ownerProfile = await getOwnerProfile(userSupabase);
  const serviceClient = createServiceClient();
  const artist = await getArtistForOwner(id, ownerProfile, serviceClient);
  const profile = await getProfileForArtist(artist, serviceClient);

  const { error: artistDeleteError } = await serviceClient
    .from('artists')
    .delete()
    .eq('id', artist.id);

  if (artistDeleteError) {
    throw new Error(artistDeleteError.message);
  }

  if (profile) {
    const { error: userDeleteError } = await serviceClient.auth.admin.deleteUser(profile.user_id);
    if (userDeleteError) {
      throw new Error(userDeleteError.message);
    }
  }

  res.statusCode = 204;
  res.end();
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const allowedMethods = 'PATCH, DELETE';
  setCorsHeaders(res, allowedMethods);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const id = getIdFromUrl(req.url);

  if (!id) {
    sendJson(res, 400, { error: 'Falta el ID del tatuador en la URL' });
    return;
  }

  try {
    const userSupabase = createVercelSupabaseClient(req, res);

    if (req.method === 'PATCH') {
      await handlePatch(id, req, res, userSupabase);
    } else if (req.method === 'DELETE') {
      await handleDelete(id, res, userSupabase);
    } else {
      sendJson(res, 405, { error: 'Method Not Allowed' });
    }
  } catch (error) {
    const message = getErrorMessage(error);
    const status =
      message === 'No autenticado' ? 401 : message.includes('permisos') ? 403 : 400;
    // Always log the real error server-side. Without this, any failure that
    // isn't a clean thrown Error (network hiccups, Supabase Auth quirks,
    // serverless timeouts, etc.) is invisible once the client only sees a
    // generic message — there'd be no way to diagnose it after the fact.
    console.error(`[api/artists] ${req.method} ${req.url} failed:`, error);
    sendJson(res, status, { error: message });
  }
}
