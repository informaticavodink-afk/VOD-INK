import type { NextFunction, Request, Response } from 'express';
import { createClient } from './server.js';

// Express middleware equivalent to the Next.js session-refresh middleware.
// Mount it on API/admin routes that need Supabase Auth cookies refreshed.
export async function refreshSupabaseSession(req: Request, res: Response, next: NextFunction) {
  try {
    const supabase = createClient(req, res);
    req.supabase = supabase;

    // getUser() validates and refreshes the session cookies when necessary.
    await supabase.auth.getUser();
    next();
  } catch (error) {
    next(error);
  }
}
