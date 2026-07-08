/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/src/types/supabase';
import { KeyRound, Loader2, Mail, Pause, Pencil, Play, Plus, Trash2, UserRound, X } from 'lucide-react';
import SensitiveText from '@/src/components/SensitiveText';

type Artist = Database['public']['Tables']['artists']['Row'];

type ArtistFormData = {
  full_name: string;
  dni: string;
  qualification: string;
  login_email: string;
  password: string;
  photo_url: string;
  drive_folder_id: string;
  status: 'active' | 'paused';
};

const EMPTY_FORM: ArtistFormData = {
  full_name: '',
  dni: '',
  qualification: '',
  login_email: '',
  password: '',
  photo_url: '',
  drive_folder_id: '',
  status: 'active',
};

interface ArtistsManagerProps {
  studioId: string;
}

async function parseApiError(response: Response) {
  const body = await response.json().catch(() => ({ error: 'Error desconocido' }));
  return body.error || `Error ${response.status}`;
}

export default function ArtistsManager({ studioId }: ArtistsManagerProps) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [form, setForm] = useState<ArtistFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const loadArtists = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('artists')
      .select('*')
      .eq('studio_id', studioId)
      .order('full_name', { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setArtists(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadArtists();
  }, [studioId]);

  const openCreate = () => {
    setEditingArtist(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (artist: Artist) => {
    setEditingArtist(artist);
    setForm({
      full_name: artist.full_name,
      dni: artist.dni,
      qualification: artist.qualification,
      login_email: artist.login_email || '',
      password: '',
      photo_url: artist.photo_url || '',
      drive_folder_id: artist.drive_folder_id || '',
      status: artist.status,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingArtist(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      login_email: form.login_email || null,
      password: form.password || undefined,
      photo_url: form.photo_url || null,
      drive_folder_id: form.drive_folder_id || null,
    };

    try {
      const response = await fetch(editingArtist ? `/api/artists/${editingArtist.id}` : '/api/artists', {
        method: editingArtist ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(await parseApiError(response));
      }

      closeModal();
      loadArtists();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'No se pudo guardar el tatuador');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (artist: Artist) => {
    const newStatus = artist.status === 'active' ? 'paused' : 'active';
    const { error } = await supabase
      .from('artists')
      .update({ status: newStatus })
      .eq('id', artist.id);

    if (error) {
      setError(error.message);
    } else {
      loadArtists();
    }
  };

  const deleteArtist = async (artist: Artist) => {
    if (
      !window.confirm(
        `¿Eliminar a ${artist.full_name}? Si tiene consentimientos asociados, la base de datos va a bloquear el borrado para no romper el historial.`
      )
    ) {
      return;
    }

    const response = await fetch(`/api/artists/${artist.id}`, { method: 'DELETE' });

    if (!response.ok) {
      setError(await parseApiError(response));
    } else {
      loadArtists();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-sans text-2xl font-black tracking-tight">Tatuadores</h2>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-zinc-800"
        >
          <Plus className="w-4 h-4" />
          Nuevo tatuador/a
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
        </div>
      ) : (
        <div className="rounded-[28px] border border-sky-200 bg-white p-3 shadow-sm">
          <div className="overflow-x-auto rounded-2xl border border-zinc-100">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="w-12 px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Estado</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Nombre y apellidos</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Licencia tatuador/a</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">DNI</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Acceso</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Foto</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {artists.map((artist) => (
                <tr key={artist.id} className="hover:bg-zinc-50/50">
                  <td className="px-4 py-3">
                    <SensitiveText>
                      <span
                        className={`inline-flex h-4 w-4 rounded-full border-2 ${
                          artist.status === 'active'
                            ? 'border-emerald-600 bg-emerald-500'
                            : 'border-red-600 bg-red-500'
                        }`}
                        title={artist.status === 'active' ? 'Activo' : 'Pausado'}
                      />
                    </SensitiveText>
                  </td>
                  <td className="px-4 py-3 font-semibold text-zinc-900">
                    <SensitiveText>{artist.full_name}</SensitiveText>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    <SensitiveText>{artist.qualification}</SensitiveText>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                    <SensitiveText>{artist.dni}</SensitiveText>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                    <SensitiveText>
                      {artist.login_email ? (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 whitespace-nowrap">
                          <Mail className="h-3 w-3 shrink-0" />
                          {artist.login_email}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-2 py-1 font-semibold text-amber-700 whitespace-nowrap">
                          <KeyRound className="h-3 w-3 shrink-0" />
                          Sin acceso
                        </span>
                      )}
                    </SensitiveText>
                  </td>
                  <td className="px-4 py-3">
                    <SensitiveText>
                      {artist.photo_url ? (
                        <img
                          src={artist.photo_url}
                          alt={`Foto de ${artist.full_name}`}
                          className="h-8 w-8 rounded-full border border-zinc-200 object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-400">
                          <UserRound className="h-4 w-4" />
                        </div>
                      )}
                    </SensitiveText>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <SensitiveText>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(artist)}
                          className="p-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 transition-all"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(artist)}
                          className={`p-2 rounded-lg border transition-all ${
                            artist.status === 'active'
                              ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={artist.status === 'active' ? 'Pausar' : 'Activar'}
                        >
                          {artist.status === 'active' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteArtist(artist)}
                          className="p-2 rounded-lg border border-red-100 text-red-600 hover:bg-red-50 transition-all"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </SensitiveText>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {artists.length === 0 && (
            <div className="text-center py-12 text-zinc-400 text-xs font-medium">
              No hay tatuadores registrados.
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-extrabold text-sm text-zinc-950">
                {editingArtist ? 'Editar tatuador' : 'Nuevo tatuador'}
              </h3>
              <button type="button" onClick={closeModal} className="p-1 text-zinc-400 hover:text-zinc-900">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
                <span className="font-bold">Acceso del tatuador:</span> este email y contraseña le permiten entrar directamente al panel de tatuador.
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">Nombre completo</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                />
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">DNI/NIE</label>
                <input
                  type="text"
                  value={form.dni}
                  onChange={(e) => setForm({ ...form, dni: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                />
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">Titulación</label>
                <input
                  type="text"
                  value={form.qualification}
                  onChange={(e) => setForm({ ...form, qualification: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                />
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">Email de acceso</label>
                <input
                  type="email"
                  value={form.login_email}
                  onChange={(e) => setForm({ ...form, login_email: e.target.value })}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  placeholder="tatuador@estudio.com"
                />
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                  {editingArtist ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingArtist}
                  minLength={6}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  placeholder={editingArtist ? 'Dejar vacío para mantener la actual' : 'Mínimo 6 caracteres'}
                />
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">URL foto (opcional)</label>
                <input
                  type="url"
                  value={form.photo_url}
                  onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                />
              </div>

              <div className="space-y-1">
                <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">ID carpeta Drive (opcional)</label>
                <input
                  type="text"
                  value={form.drive_folder_id}
                  onChange={(e) => setForm({ ...form, drive_folder_id: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-zinc-200 bg-white text-zinc-700 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-zinc-950 text-white py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-800 disabled:opacity-60"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
