import '../env';

import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Request, Response } from 'express';
import type { Database } from '@/src/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function assertSupabaseEnv() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en .env.local');
  }
}

function parseCookieHeader(cookieHeader = '') {
  if (!cookieHeader) return [];

  return cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .map((cookie) => {
      const separatorIndex = cookie.indexOf('=');
      const rawName = separatorIndex >= 0 ? cookie.slice(0, separatorIndex) : cookie;
      const rawValue = separatorIndex >= 0 ? cookie.slice(separatorIndex + 1) : '';

      return {
        name: decodeURIComponent(rawName),
        value: decodeURIComponent(rawValue),
      };
    });
}

function serializeCookie(name: string, value: string, options: Record<string, unknown> = {}) {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];

  if (typeof options.maxAge === 'number') parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires instanceof Date) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (typeof options.domain === 'string') parts.push(`Domain=${options.domain}`);
  parts.push(`Path=${typeof options.path === 'string' ? options.path : '/'}`);
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (typeof options.sameSite === 'string') parts.push(`SameSite=${options.sameSite}`);

  return parts.join('; ');
}

export function createClient(req: Request, res: Response) {
  assertSupabaseEnv();

  return createServerClient<Database>(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return parseCookieHeader(req.headers.cookie);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.append('Set-Cookie', serializeCookie(name, value, options));
        });
      },
    },
  });
}

declare global {
  namespace Express {
    interface Request {
      supabase?: SupabaseClient<Database>;
    }
  }
}
