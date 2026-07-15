/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createClient } from '@/utils/supabase/client';
import { Building2, LogOut, Menu, X, Shield } from 'lucide-react';
import PrivacyToggle from '@/src/components/PrivacyToggle';
import Branding from '@/src/components/Branding';
import { useOrganizationContext } from '@/src/providers/OrganizationProvider';

async function handleLogout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = '/';
}

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { isSuperAdmin } = useOrganizationContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-sm w-full bg-white border border-red-100 p-6 rounded-2xl shadow-xl text-center">
          <h2 className="font-sans font-extrabold text-lg text-red-900">Acceso restringido</h2>
          <p className="font-sans text-sm text-red-700 mt-2">
            Este panel es solo para administradores de la plataforma.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 font-sans lg:flex">
      {isMobileMenuOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-zinc-950/45 backdrop-blur-sm lg:hidden transition-all duration-300 cursor-default"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

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

          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
            <Shield className="h-5 w-5 text-amber-600" />
            <div className="flex flex-col min-w-0">
              <span className="truncate text-xs font-bold text-amber-900">
                Super Admin
              </span>
            </div>
          </div>

          <nav className="grid gap-2">
            <Link
              to="/super-admin"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full flex items-center justify-between gap-3 rounded-2xl border border-zinc-950 bg-zinc-950 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-white shadow-sm"
            >
              <span>Empresas</span>
              <Building2 className="h-4 w-4" />
            </Link>
          </nav>

          <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-all"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
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
            <span className="font-sans font-black text-lg tracking-tight text-zinc-900">
              Administración de plataforma
            </span>
          </div>

          <div className="flex items-center gap-4">
            <PrivacyToggle />
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
