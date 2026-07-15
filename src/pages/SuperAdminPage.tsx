/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import SuperAdminLayout from '@/src/components/layouts/SuperAdminLayout';
import SensitiveText from '@/src/components/SensitiveText';
import ChangePasswordForm from '@/src/components/ChangePasswordForm';
import type { Database } from '@/src/types/supabase';


type Organization = Database['public']['Tables']['organizations']['Row'];

export default function SuperAdminPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);

    supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setOrganizations(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="font-sans font-black text-2xl text-zinc-900">
            Empresas
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Administración de organizaciones en la plataforma.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-500">Cargando...</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-3 text-left font-bold text-zinc-700">Nombre</th>
                  <th className="px-6 py-3 text-left font-bold text-zinc-700">Slug</th>
                  <th className="px-6 py-3 text-left font-bold text-zinc-700">Estado</th>
                  <th className="px-6 py-3 text-left font-bold text-zinc-700">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {organizations.map((org) => (
                  <tr key={org.id}>
                    <td className="px-6 py-4">
                      <SensitiveText>{org.name}</SensitiveText>
                    </td>
                    <td className="px-6 py-4 font-mono text-zinc-600">{org.slug}</td>
                    <td className="px-6 py-4 capitalize">{org.status}</td>
                    <td className="px-6 py-4 text-zinc-500">
                      {new Date(org.created_at).toLocaleDateString('es-ES')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ChangePasswordForm />
      </div>
    </SuperAdminLayout>
  );
}
