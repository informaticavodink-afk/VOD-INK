/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import { useProfile } from '@/src/hooks/useProfile';
import LoginForm from '@/src/components/admin/LoginForm';
import ArtistLayout from '@/src/components/artist/ArtistLayout';
import ArtistConsents, { type ArtistConsentsHandle } from '@/src/components/artist/ArtistConsents';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/src/types/supabase';
import InterventionModal from '../components/artist/InterventionModal';
import ArtistConsentDetailsModal from '../components/artist/ArtistConsentDetailsModal';
import { shouldPersistTechnique } from '../domain/consents/artistConsentWorkflow';
import { signArtistConsent, toArtistActionError, type ArtistActionError } from '../lib/artistFinalization';

type Artist = Database['public']['Tables']['artists']['Row'];
type Consent = Database['public']['Tables']['consents']['Row'];
type ConsentWithStudio = Consent & { studios: { trade_name: string } | null };
type ArtistSidebarFilter = 'all' | 'pending_signature';

async function readApiError(response: Response, fallback: string) {
  const body = await response.text();
  if (body) {
    try {
      const parsed = JSON.parse(body) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      // Vercel can return an HTML platform error before the API handler runs.
    }
  }
  return `${fallback} (HTTP ${response.status})`;
}

export default function ArtistPage() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [pendingConsents, setPendingConsents] = useState<ConsentWithStudio[]>([]);
  const [previewingConsent, setPreviewingConsent] = useState<ConsentWithStudio | null>(null);
  const [activeFilter, setActiveFilter] = useState<ArtistSidebarFilter>('all');
  const consentsRef = useRef<ArtistConsentsHandle | null>(null);

  // States for intervention modal
  const [interveningConsent, setInterveningConsent] = useState<ConsentWithStudio | null>(null);
  const [isSavingIntervention, setIsSavingIntervention] = useState<boolean>(false);
  const [interventionError, setInterventionError] = useState<ArtistActionError | null>(null);
  const [isDiscardingConsent, setIsDiscardingConsent] = useState<boolean>(false);
  const [discardError, setDiscardError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const loadPendingConsents = useCallback(async (artistId: string) => {
    const { data, error } = await supabase
      .from('consents')
      .select('*, studios(trade_name)')
      .eq('artist_id', artistId)
      .in('status', ['pending_technique', 'pending_artist', 'upload_error'])
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPendingConsents(data);
    }
  }, [supabase]);

  // react-doctor-disable-next-line effect-needs-cleanup -- Supabase channel is explicitly unsubscribed below.
  useEffect(() => {
    if (!user || !profile || profile.role !== 'artist') return;

    let channel: any = null;
    let cancelled = false;

    const setup = async () => {
      const { data } = await supabase
        .from('artists')
        .select('*')
        .eq('profile_id', profile.id)
        .single();

      if (cancelled || !data) return;

      setArtist(data);
      await loadPendingConsents(data.id);

      const channelName = `artist-page-realtime-${data.id}`;
      const existingChannel = supabase
        .getChannels()
        .find((ch: any) => ch.topic === `realtime:${channelName}`);
      if (existingChannel) {
        supabase.removeChannel(existingChannel);
      }

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'consents',
            filter: `artist_id=eq.${data.id}`,
          },
          () => {
            loadPendingConsents(data.id);
          }
        )
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            console.warn('[Realtime ArtistPage] canal en estado', status);
          }
        });
    };

    setup();

    return () => {
      cancelled = true;
      if (channel) {
        void channel.unsubscribe();
      }
    };
  }, [user, profile, loadPendingConsents, supabase]);

  const handleSaveIntervention = async (techniqueData: any, signature: string) => {
    if (!interveningConsent) return;
    setIsSavingIntervention(true);
    setInterventionError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('La sesión ha caducado. Inicia sesión de nuevo.');
      const authenticatedHeaders = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      };

      // La técnica solo se persiste en su fase. En pending_artist y upload_error
      // ya es inmutable y el reintento debe continuar directamente con la firma.
      if (shouldPersistTechnique(interveningConsent.status)) {
        const responseTech = await fetch(`/api/consents/${interveningConsent.id}/technique`, {
          method: 'PATCH',
          headers: authenticatedHeaders,
          body: JSON.stringify({ techniqueData }),
        });

        if (!responseTech.ok) {
          throw new Error(await readApiError(responseTech, 'Error al guardar la intervención'));
        }

        setInterveningConsent((current) => current ? {
          ...current,
          technique_data: techniqueData,
          status: 'pending_artist',
        } : current);
        setPendingConsents((current) => current.map((consent) => consent.id === interveningConsent.id ? {
          ...consent,
          technique_data: techniqueData,
          status: 'pending_artist',
        } : consent));
      }

      // Sign and finalize the PDF; retries keep this consent ID.
      await signArtistConsent(interveningConsent.id, signature, session.access_token);

      // Optimistic update: mark as signed locally so the UI feels instant
      setPendingConsents((prev) =>
        prev.map((c) => (c.id === interveningConsent.id ? { ...c, status: 'signed' } : c))
      );

      setInterveningConsent(null);

      // Force a full refresh of the main table and the pending list
      if (artist) {
        await loadPendingConsents(artist.id);
        consentsRef.current?.loadConsents();
      }
    } catch (err) {
      setInterventionError(toArtistActionError(err, 'Error al guardar los datos de intervención y firma'));
    } finally {
      setIsSavingIntervention(false);
    }
  };

  const handleDiscardConsent = async (consent: ConsentWithStudio) => {
    setIsDiscardingConsent(true);
    setDiscardError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('La sesión ha caducado. Inicia sesión de nuevo.');
      const response = await fetch(`/api/consents/${consent.id}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Error al descartar el consentimiento'));
      }

      setPendingConsents((prev) => prev.filter((c) => c.id !== consent.id));
      setPreviewingConsent(null);

      // Force refresh of the main table and the pending list after discarding
      if (artist) {
        await loadPendingConsents(artist.id);
        consentsRef.current?.loadConsents();
      }
    } catch (err) {
      const nextError = err instanceof Error ? err.message : 'Error al descartar el consentimiento';
      setDiscardError(nextError);
      throw err instanceof Error ? err : new Error(nextError);
    } finally {
      setIsDiscardingConsent(false);
    }
  };

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

  if (profile?.role === 'owner' || profile?.role === 'admin') {
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
    <>
      <ArtistLayout
        profile={profile}
        artist={artist}
        pendingConsents={pendingConsents}
        activeFilter={activeFilter}
        onShowAllConsents={() => setActiveFilter('all')}
        onShowPendingSignatureConsents={() => setActiveFilter('pending_signature')}
        onInterveneConsent={(consent) => {
          setInterveningConsent(consent);
          setInterventionError(null);
        }}
      >
        {artist ? (
          <ArtistConsents
            ref={consentsRef}
            artistId={artist.id}
            artist={artist}
            statusFilter={activeFilter}
            onStatusFilterChange={setActiveFilter}
            onPreviewConsent={(consent) => {
              setPreviewingConsent(consent);
              setDiscardError(null);
            }}
            onInterveneConsent={(consent) => {
              setInterveningConsent(consent);
              setInterventionError(null);
            }}
          />
        ) : (
          <div className="text-center py-12 text-zinc-500 text-sm">
            No se encontró un perfil de tatuador vinculado a tu cuenta.
          </div>
        )}
      </ArtistLayout>

      {/* Intervention Modal */}
      <InterventionModal
        isOpen={!!interveningConsent}
        onClose={() => setInterveningConsent(null)}
        consent={interveningConsent}
        artist={artist}
        onSave={handleSaveIntervention}
        isSaving={isSavingIntervention}
        error={interventionError}
      />

      <ArtistConsentDetailsModal
        isOpen={!!previewingConsent}
        consent={previewingConsent}
        isDiscarding={isDiscardingConsent}
        error={discardError}
        onClose={() => {
          setPreviewingConsent(null);
          setDiscardError(null);
        }}
        onConfirmDiscard={handleDiscardConsent}
      />
    </>
  );
}
