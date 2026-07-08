/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import { useProfile } from '@/src/hooks/useProfile';
import LoginForm from '@/src/components/admin/LoginForm';
import ArtistLayout from '@/src/components/artist/ArtistLayout';
import ArtistConsents from '@/src/components/artist/ArtistConsents';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/src/types/supabase';

type Artist = Database['public']['Tables']['artists']['Row'];

export default function ArtistPage() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!user || !profile || profile.role !== 'artist') return;

    const supabase = createClient();

    supabase
      .from('artists')
      .select('*')
      .eq('profile_id', profile.id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setArtist(data);

          supabase
            .from('consents')
            .select('id', { count: 'exact', head: true })
            .eq('artist_id', data.id)
            .eq('status', 'pending_artist')
            .then(({ count }) => {
              setPendingCount(count || 0);
            });
        }
      });
  }, [user, profile]);

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  if (profile?.role === 'owner') {
    return <Navigate to="/admin" replace />;
  }

  if (profile?.role !== 'artist') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-sm w-full bg-white border border-red-100 p-6 rounded-2xl shadow-xl text-center">
          <h2 className="font-sans font-extrabold text-lg text-red-900">Acceso restringido</h2>
          <p className="font-sans text-sm text-red-700 mt-2">
            Este panel es solo para tatuadores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ArtistLayout profile={profile} artist={artist} pendingCount={pendingCount}>
      {artist ? (
        <ArtistConsents artistId={artist.id} artist={artist} />
      ) : (
        <div className="text-center py-12 text-zinc-500 text-sm">
          No se encontró un perfil de tatuador vinculado a tu cuenta.
        </div>
      )}
    </ArtistLayout>
  );
}
