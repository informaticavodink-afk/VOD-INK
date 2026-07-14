/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOrganizationContext } from '@/src/providers/OrganizationProvider';
import OrganizationLayout from '@/src/components/layouts/OrganizationLayout';

export default function OrganizationSettingsPage() {
  const { organization } = useOrganizationContext();

  return (
    <OrganizationLayout>
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="font-sans font-black text-2xl text-zinc-900">
          Configuración
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Configuración de {organization?.name || 'la empresa'}.
        </p>

        <div className="mt-6 space-y-4">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-xs font-bold text-zinc-700">Slug</p>
            <p className="text-sm text-zinc-600 font-mono">{organization?.slug}</p>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-xs font-bold text-zinc-700">Nombre legal</p>
            <p className="text-sm text-zinc-600">{organization?.legal_name || '—'}</p>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
            <p className="text-xs font-bold text-zinc-700">Email de facturación</p>
            <p className="text-sm text-zinc-600">{organization?.billing_email || '—'}</p>
          </div>
        </div>
      </div>
    </OrganizationLayout>
  );
}
