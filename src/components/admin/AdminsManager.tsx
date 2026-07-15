import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/src/types/supabase';
import { Loader2, Plus, ShieldCheck, X } from 'lucide-react';
import SensitiveText from '@/src/components/SensitiveText';

type Profile = Database['public']['Tables']['profiles']['Row'];

type AdminForm = {
  full_name: string;
  email: string;
  password: string;
};

const EMPTY_FORM: AdminForm = { full_name: '', email: '', password: '' };

async function getApiError(response: Response) {
  const body = await response.json().catch(() => null);
  return body?.error || `No se pudo crear el administrador (error ${response.status}).`;
}

export default function AdminsManager({ studioId }: { studioId: string }) {
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<AdminForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadAdmins = async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('*')
      .eq('studio_id', studioId)
      .in('role', ['owner', 'admin'])
      .order('created_at', { ascending: true });

    if (loadError) setError(loadError.message);
    else setAdmins(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAdmins();
  }, [studioId]);

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!response.ok) throw new Error(await getApiError(response));

      closeModal();
      await loadAdmins();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo crear el administrador.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-sans text-xl font-black text-zinc-900">Administradores</h2>
          <p className="mt-1 text-sm text-zinc-600">Usuarios con acceso al panel de VOD INK.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setShowModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-zinc-800"
        >
          <Plus className="h-4 w-4" />
          Crear administrador
        </button>
      </div>

      {error && !showModal && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-bold text-zinc-700">Nombre</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-zinc-700">Permiso</th>
                <th className="px-5 py-3 text-left text-xs font-bold text-zinc-700">Alta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {admins.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-5 py-4"><SensitiveText>{admin.full_name}</SensitiveText></td>
                  <td className="px-5 py-4 capitalize text-zinc-600">{admin.role === 'owner' ? 'Propietario' : 'Administrador'}</td>
                  <td className="px-5 py-4 text-zinc-500">{new Date(admin.created_at).toLocaleDateString('es-ES')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/50 p-4 pt-8 backdrop-blur-sm sm:pt-12">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-zinc-900">Crear administrador</h3>
                <p className="mt-1 text-sm text-zinc-600">Tendrá acceso al panel y podrá gestionar tatuadores y administradores.</p>
              </div>
              <button type="button" onClick={closeModal} aria-label="Cerrar" className="rounded-xl border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">Nombre</label>
                <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required placeholder="Nombre" className="w-full px-3 py-2" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">Correo</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="Correo" className="w-full px-3 py-2" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">Contraseña inicial</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} placeholder="Contraseña" className="w-full px-3 py-2" />
              </div>

              {error && <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">{error}</div>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} disabled={saving} className="flex-1 rounded-xl border border-zinc-200 py-3 text-xs font-bold uppercase tracking-wider text-zinc-700 hover:bg-zinc-50 disabled:opacity-60">Cancelar</button>
                <button type="submit" disabled={saving} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-950 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-zinc-800 disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
