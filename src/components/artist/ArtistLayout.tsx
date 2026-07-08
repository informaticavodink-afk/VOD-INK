/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/src/types/supabase';
import { Bell, FileText, LogOut, ShieldCheck, UserRound } from 'lucide-react';
import PrivacyToggle from '@/src/components/PrivacyToggle';
import SensitiveText from '@/src/components/SensitiveText';
import Branding from '@/src/components/Branding';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Artist = Database['public']['Tables']['artists']['Row'];

interface ArtistLayoutProps {
  profile: Profile;
  artist: Artist | null;
  pendingCount: number;
  children: React.ReactNode;
}

async function handleArtistLogout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = '/artist';
}

export default function ArtistLayout({ profile, artist, pendingCount, children }: ArtistLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 font-sans lg:flex">
      <aside className="bg-white border-b border-zinc-200 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex h-full flex-col gap-8 p-6">
          <Branding />

          <hr className="border-zinc-100 -mx-1" />

          <nav className="grid gap-2">
            <button type="button" className="w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-950 bg-zinc-950 px-3.5 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] text-white shadow-sm cursor-pointer">
              <span className="whitespace-nowrap">Consentimientos</span>
              <FileText className="h-4 w-4 text-zinc-300" />
            </button>

            <button type="button" className="flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[11px] font-black uppercase tracking-[0.08em] text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900 cursor-pointer">
              <span className="whitespace-nowrap">Pendientes de firmar</span>
              <span className="inline-flex h-7 min-w-[28px] items-center justify-center rounded-full border border-zinc-300 bg-zinc-50 px-1.5 text-zinc-700 font-bold text-[10px]">
                {pendingCount}
              </span>
            </button>
          </nav>

          {/* Tarjeta de perfil y cuenta profesional integrada */}
          <div className="mt-auto flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
            <div className="flex items-center gap-3">
              <SensitiveText>
                {artist?.photo_url ? (
                  <img
                    src={artist.photo_url}
                    alt={`Foto de ${artist.full_name || profile.full_name}`}
                    className="h-10 w-10 rounded-full border border-zinc-200 bg-white object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400">
                    <UserRound className="h-5 w-5" />
                  </div>
                )}
              </SensitiveText>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-bold text-zinc-950">
                  <SensitiveText>{artist?.full_name || profile.full_name}</SensitiveText>
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">Tatuador</span>
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-zinc-200/60 pt-3">
              <ShieldCheck className="h-4 w-4 text-zinc-400 shrink-0" />
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-zinc-500 font-bold">
                Cuenta profesional
              </span>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-5 py-5 backdrop-blur">
          <div>
            <span className="font-sans font-black text-lg tracking-tight text-zinc-900">Panel del tatuador</span>
          </div>

          <div className="flex items-center gap-4">
            <PrivacyToggle />
            <div className="hidden items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 sm:flex">
              <Bell className="w-4 h-4 text-zinc-600" />
              <span className="font-sans font-bold text-xs text-zinc-700">
                {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="text-right hidden sm:block">
              <div className="font-sans font-semibold text-xs text-zinc-900">
                <SensitiveText>{profile.full_name}</SensitiveText>
              </div>
            </div>
            <button
              type="button"
              onClick={handleArtistLogout}
              className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
