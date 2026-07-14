/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOrganizationContext } from '@/src/providers/OrganizationProvider';
import OrganizationLayout from '@/src/components/layouts/OrganizationLayout';

export default function OrganizationDashboardPage() {
  const { organization, membership } = useOrganizationContext();

  return (
    <OrganizationLayout>
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="font-sans font-black text-2xl text-zinc-900">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Bienvenido al panel de empresa.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Empresa
            </p>
            <p className="mt-1 font-sans font-bold text-lg text-zinc-900">
              {organization?.name || '—'}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Rol
            </p>
            <p className="mt-1 font-sans font-bold text-lg text-zinc-900 capitalize">
              {membership?.role || '—'}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Estado
            </p>
            <p className="mt-1 font-sans font-bold text-lg text-zinc-900 capitalize">
              {organization?.status || '—'}
            </p>
          </div>
        </div>
      </div>
    </OrganizationLayout>
  );
}
