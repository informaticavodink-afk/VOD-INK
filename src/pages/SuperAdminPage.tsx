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
import { UserPlus, X } from 'lucide-react';


type Organization = Database['public']['Tables']['organizations']['Row'];

type AdminForm = {
  full_name: string;
  email: string;
  password: string;
  organization_id: string;
  organization_role: 'admin' | 'owner';
  platform_role: 'user';
};

const emptyAdminForm: AdminForm = {
  full_name: '',
  email: '',
  password: '',
  organization_id: '',
  organization_role: 'admin',
  platform_role: 'user',
};

export default function SuperAdminPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateAdmin, setShowCreateAdmin] = useState(false);
  const [adminForm, setAdminForm] = useState<AdminForm>(emptyAdminForm);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    setLoading(true);

    supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) {
          const orgs = data || [];
          setOrganizations(orgs);
          setAdminForm((current) => ({
            ...current,
            organization_id: current.organization_id || orgs[0]?.id || '',
          }));
        }
        setLoading(false);
      });
  }, []);

  const openCreateAdmin = () => {
    setAdminError(null);
    setAdminSuccess(null);
    setShowCreateAdmin(true);
  };

  const closeCreateAdmin = () => {
    if (savingAdmin) return;
    setShowCreateAdmin(false);
    setAdminError(null);
  };

  const handleCreateAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingAdmin(true);
    setAdminError(null);
    setAdminSuccess(null);

    try {
      const response = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error || 'No se pudo crear el administrador');
      }

      setAdminSuccess(`Administrador creado: ${body.user?.email || adminForm.email}`);
      setAdminForm({
        ...emptyAdminForm,
        organization_id: adminForm.organization_id,
      });
      setShowCreateAdmin(false);
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : 'No se pudo crear el administrador');
    } finally {
      setSavingAdmin(false);
    }
  };

  const createAdminButton = (
    <button
      type="button"
      onClick={openCreateAdmin}
      disabled={!organizations.length}
      aria-label="Crear administrador"
      title="Crear administrador"
      className="p-2 rounded-xl border border-zinc-200 text-zinc-950 hover:bg-zinc-50 transition-all disabled:cursor-not-allowed disabled:opacity-60"
    >
      <UserPlus className="w-4 h-4" />
    </button>
  );

  return (
    <SuperAdminLayout headerAction={createAdminButton}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="font-sans font-black text-2xl text-zinc-900">
            Empresas
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Administración de organizaciones en la plataforma.
          </p>

          {adminSuccess && (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-700">
              {adminSuccess}
            </div>
          )}
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

      {showCreateAdmin && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-8 backdrop-blur-sm sm:pt-12">
          <div className="w-full max-w-3xl rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-sans text-xl font-black text-zinc-900">
                  Crear administrador
                </h2>
                <p className="mt-1 text-sm text-zinc-600">
                  Crea un usuario con acceso al panel de una empresa.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateAdmin}
                aria-label="Cerrar"
                className="rounded-xl border border-zinc-200 p-2 text-zinc-500 transition-all hover:bg-zinc-50 hover:text-zinc-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1">
                <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                  Nombre
                </label>
                <input
                  type="text"
                  value={adminForm.full_name}
                  onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                  required
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  placeholder="Nombre del administrador"
                />
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                  Correo
                </label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  required
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  placeholder="Correo"
                />
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                  Contraseña
                </label>
                <input
                  type="password"
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  placeholder="Contraseña"
                />
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                  Empresa
                </label>
                <select
                  value={adminForm.organization_id}
                  onChange={(e) => setAdminForm({ ...adminForm, organization_id: e.target.value })}
                  required
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                >
                  <option value="" disabled>
                    Selecciona empresa
                  </option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 lg:col-span-2">
                <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                  Permiso empresa
                </label>
                <select
                  value={adminForm.organization_role}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, organization_role: e.target.value as AdminForm['organization_role'] })
                  }
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                >
                  <option value="admin">Administrador</option>
                  <option value="owner">Propietario</option>
                </select>
              </div>

              {adminError && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700 lg:col-span-2">
                  {adminError}
                </div>
              )}

              <div className="flex gap-3 lg:col-span-2">
                <button
                  type="button"
                  onClick={closeCreateAdmin}
                  disabled={savingAdmin}
                  className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-wider text-zinc-700 transition-all hover:bg-zinc-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingAdmin || !organizations.length}
                  className="flex-1 rounded-xl bg-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingAdmin ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
