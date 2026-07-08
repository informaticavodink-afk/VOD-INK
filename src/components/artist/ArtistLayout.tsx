import React, { useState, useRef, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/src/types/supabase';
import { Bell, FileText, LogOut, ShieldCheck, UserRound, X, FileSignature, Menu } from 'lucide-react';
import PrivacyToggle from '@/src/components/PrivacyToggle';
import SensitiveText from '@/src/components/SensitiveText';
import Branding from '@/src/components/Branding';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Artist = Database['public']['Tables']['artists']['Row'];
type Consent = Database['public']['Tables']['consents']['Row'];
type ConsentWithStudio = Consent & { studios: { trade_name: string } | null };
type ArtistSidebarFilter = 'all' | 'pending_signature';

interface ArtistLayoutProps {
  profile: Profile;
  artist: Artist | null;
  pendingConsents: ConsentWithStudio[];
  activeFilter: ArtistSidebarFilter;
  onShowAllConsents: () => void;
  onShowPendingSignatureConsents: () => void;
  onInterveneConsent: (consent: ConsentWithStudio) => void;
  children: React.ReactNode;
}

function isPendingSignatureStatus(status: Consent['status']) {
  return status === 'pending_technique' || status === 'pending_artist';
}

async function handleArtistLogout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = '/artist';
}

export default function ArtistLayout({
  profile,
  artist,
  pendingConsents,
  activeFilter,
  onShowAllConsents,
  onShowPendingSignatureConsents,
  onInterveneConsent,
  children,
}: ArtistLayoutProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pendingActionCount = pendingConsents.filter((consent) => isPendingSignatureStatus(consent.status)).length;
  const pendingSignatureCount = pendingActionCount;
  const isShowingPendingSignatureFilter = activeFilter === 'pending_signature';

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 font-sans lg:flex">
      {/* Backdrop overlay for mobile drawer */}
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-zinc-950/45 backdrop-blur-sm lg:hidden transition-all duration-300 cursor-default"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={`bg-white border-zinc-200 z-50 fixed inset-y-0 left-0 w-72 border-r transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:z-auto lg:translate-x-0 lg:border-r lg:border-b-0 ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col gap-8 p-6">
          <div className="flex items-center justify-between">
            <Branding />
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 lg:hidden cursor-pointer"
              title="Cerrar menú"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <hr className="border-zinc-100 -mx-1" />

          <nav className="grid gap-2">
            <button
              type="button"
              onClick={() => {
                onShowAllConsents();
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] shadow-sm cursor-pointer transition-colors ${
                !isShowingPendingSignatureFilter
                  ? 'border-zinc-950 bg-zinc-950 text-white'
                  : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <span className="whitespace-nowrap">Consentimientos</span>
              <FileText className={`h-4 w-4 ${!isShowingPendingSignatureFilter ? 'text-zinc-300' : 'text-zinc-400'}`} />
            </button>

            <button
              type="button"
              onClick={() => {
                onShowPendingSignatureConsents();
                setIsOpen(false);
                setIsMobileMenuOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-2xl border px-3.5 py-2.5 text-[11px] font-black uppercase tracking-[0.08em] cursor-pointer transition-colors ${
                isShowingPendingSignatureFilter
                  ? 'border-amber-200 bg-amber-50 text-amber-800'
                  : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900'
              }`}
            >
              <span className="whitespace-nowrap">Pendientes de firmar</span>
              <span
                className={`inline-flex h-7 min-w-[28px] items-center justify-center rounded-full border px-1.5 font-bold text-[10px] ${
                  isShowingPendingSignatureFilter
                    ? 'border-amber-300 bg-white text-amber-800'
                    : 'border-zinc-300 bg-zinc-50 text-zinc-700'
                }`}
              >
                {pendingSignatureCount}
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
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-5 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 lg:hidden cursor-pointer"
              title="Abrir menú"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="font-sans font-black text-lg tracking-tight text-zinc-900">Panel del tatuador</span>
          </div>

          <div className="flex items-center gap-4">
            <PrivacyToggle />

            {/* Popover / Dropdown de Pendientes */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-all duration-200 cursor-pointer relative ${
                  pendingActionCount > 0
                    ? 'border-amber-200 bg-amber-50/60 text-amber-800 hover:bg-amber-50 hover:border-amber-300'
                    : 'border-zinc-200 bg-zinc-50/50 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
                }`}
                title="Ver consentimientos pendientes de firma"
              >
                <Bell className="w-4 h-4 shrink-0" />
                <span className="font-sans font-bold text-xs hidden sm:inline">
                  {pendingActionCount} pendiente{pendingActionCount !== 1 ? 's' : ''}
                </span>
                {pendingActionCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white leading-none shadow-sm sm:hidden animate-pulse">
                    {pendingActionCount}
                  </span>
                )}
              </button>

              {isOpen && (
                <div className="absolute right-[-48px] sm:right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl z-50 animate-fadeIn space-y-3">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <span className="font-sans font-bold text-xs text-zinc-900">
                      Firmas pendientes ({pendingActionCount})
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto divide-y divide-zinc-100 pr-1">
                    {pendingActionCount === 0 ? (
                      <div className="py-8 text-center text-xs text-zinc-400 font-medium">
                        ¡Todo al día! No tenés firmas pendientes 🎉
                      </div>
                    ) : (
                      pendingConsents.map((consent) => (
                        <div key={consent.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-zinc-900">
                              <SensitiveText>{consent.client_full_name}</SensitiveText>
                            </p>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider mt-0.5">
                              <SensitiveText>{new Date(consent.created_at).toLocaleDateString('es-ES')}</SensitiveText>
                            </p>
                          </div>
                          {consent.status === 'pending_technique' || consent.status === 'pending_artist' ? (
                            <button
                              type="button"
                              onClick={() => {
                                onInterveneConsent(consent);
                                setIsOpen(false);
                              }}
                              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-red-600 hover:bg-red-100 transition-all cursor-pointer"
                            >
                              <FileSignature className="w-3.5 h-3.5" />
                              Firmar
                            </button>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ajustes de Perfil y Cierre de Sesión (Sección Derecha) */}
            <div className="flex items-center gap-3 border-l border-zinc-200 pl-4 h-8">
              <div className="flex items-center gap-2 select-none">
                <SensitiveText>
                  {artist?.photo_url ? (
                    <img
                      src={artist.photo_url}
                      alt={`Foto de ${artist.full_name || profile.full_name}`}
                      className="h-8 w-8 rounded-full border border-zinc-200 bg-white object-cover shadow-sm"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 font-bold text-xs uppercase shadow-sm">
                      {profile.full_name.charAt(0)}
                    </div>
                  )}
                </SensitiveText>
                <div className="hidden flex-col text-left sm:flex max-w-[120px]">
                  <span className="truncate text-xs font-bold text-zinc-900 leading-tight">
                    <SensitiveText>{artist?.full_name || profile.full_name}</SensitiveText>
                  </span>
                  <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider mt-0.5">Tatuador</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleArtistLogout}
                className="p-2 rounded-xl border border-zinc-200 text-zinc-400 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all duration-200 cursor-pointer"
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
