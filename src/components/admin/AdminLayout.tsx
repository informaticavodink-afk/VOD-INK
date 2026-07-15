/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/src/types/supabase';
import { FileText, LogOut, Users, Menu, X, UserPlus } from 'lucide-react';
import PrivacyToggle from '@/src/components/PrivacyToggle';
import SensitiveText from '@/src/components/SensitiveText';
import Branding from '@/src/components/Branding';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AdminLayoutProps {
  profile: Profile;
  activeTab: 'artists' | 'consents';
  onTabChange: (tab: 'artists' | 'consents') => void;
  children: React.ReactNode;
}

async function handleAdminLogout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = '/admin';
}

export default function AdminLayout({ profile, activeTab, onTabChange, children }: AdminLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navButtonClass = (tab: 'artists' | 'consents') =>
    `w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-black uppercase tracking-[0.12em] transition-all cursor-pointer ${
      activeTab === tab
        ? 'border-zinc-950 bg-zinc-950 text-white shadow-sm'
        : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-900'
    }`;

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
                onTabChange('artists');
                setIsMobileMenuOpen(false);
              }}
              className={navButtonClass('artists')}
            >
              <span>Tatuadores</span>
              <Users className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                onTabChange('consents');
                setIsMobileMenuOpen(false);
              }}
              className={navButtonClass('consents')}
            >
              <span>Consentimientos</span>
              <FileText className="h-4 w-4" />
            </button>

          </nav>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/90 px-5 py-5 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 lg:hidden cursor-pointer"
              title="Abrir menú"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="font-sans font-black text-lg tracking-tight text-zinc-900">Panel de estudio</span>
          </div>

          <div className="flex items-center gap-4">
            {profile.platform_role === 'super_admin' && (
              <a
                href="/super-admin"
                aria-label="Crear usuario"
                title="Crear usuario"
                className="p-2 rounded-xl border border-zinc-200 text-zinc-950 hover:bg-zinc-50 transition-all"
              >
                <UserPlus className="w-4 h-4" />
              </a>
            )}
            <PrivacyToggle />
            <div className="text-right hidden sm:block">
              <div className="font-sans font-semibold text-xs text-zinc-900">
                <SensitiveText>{profile.full_name}</SensitiveText>
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-zinc-400 font-bold">
                {profile.role === 'owner' ? 'Propietario' : 'Tatuador'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleAdminLogout}
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
