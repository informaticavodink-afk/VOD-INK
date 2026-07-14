/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useOrganizationContext } from '@/src/providers/OrganizationProvider';
import ProfessionalLayout from '@/src/components/layouts/ProfessionalLayout';
import ArtistConsents, { type ArtistConsentsHandle } from '@/src/components/artist/ArtistConsents';
import type { Database } from '@/src/types/supabase';

type Artist = Database['public']['Tables']['artists']['Row'];

export default function ProfessionalDashboardPage() {
  const { organization } = useOrganizationContext();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const consentsRef = useRef<ArtistConsentsHandle>(null);

  useEffect(() => {
    if (!organization) return;

    const supabase = createClient();
    setLoading(true);

    supabase
      .from('artists')
      .select('*')
      .eq('studio_id', organization.id)
      .single()
      .then(({ data, error }) => {
        if (!error) setArtist(data);
        setLoading(false);
      });
  }, [organization]);

  if (loading) {
    return (
      <ProfessionalLayout>
        <div className="text-center py-12 text-zinc-500">Cargando perfil profesional...</div>
      </ProfessionalLayout>
    );
  }

  if (!artist) {
    return (
      <ProfessionalLayout>
        <div className="text-center py-12 text-zinc-500">
          No se encontró un perfil de profesional vinculado a esta empresa.
        </div>
      </ProfessionalLayout>
    );
  }

  return (
    <ProfessionalLayout>
      <ArtistConsents
        ref={consentsRef}
        artistId={artist.id}
        artist={artist}
        statusFilter="all"
        onStatusFilterChange={() => {}}
        onPreviewConsent={() => {}}
        onInterveneConsent={() => {}}
      />
    </ProfessionalLayout>
  );
}
