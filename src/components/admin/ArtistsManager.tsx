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
  // Clone so we can fall back to raw text if the body isn't valid JSON
  // (e.g. a serverless crash/timeout returning an HTML error page).
  const raw = await response.clone().text();

  try {
    const body = JSON.parse(raw);
    if (body?.error) return body.error;
  } catch {
    // not JSON — fall through to the raw-text fallback below
  }

  const snippet = raw.trim().slice(0, 200);
  console.error(`[ArtistsManager] Respuesta no-JSON del servidor (${response.status}):`, raw);
  return snippet
    ? `Error ${response.status} del servidor: ${snippet}`
    : `Error ${response.status} del servidor (sin detalle, revisá los logs)`;
}

export default function ArtistsManager({ studioId }: ArtistsManagerProps) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [form, setForm] = useState<ArtistFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  // States for bulk/mass actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState({
    qualification: '',
    drive_folder_id: '',
    status: 'active' as 'active' | 'paused',
    updateQualification: false,
    updateDriveFolder: false,
    updateStatus: false,
  });

  const supabase = createClient();

  const loadArtists = async () => {
    setLoading(true);
    setError(null);
    setSelectedIds([]); // Clear selection when loading
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
    setShowPasswordConfirm(false);
    setEditingArtist(null);
    setForm(EMPTY_FORM);
  };

  // True when this edit would overwrite credentials that already exist:
  // the artist already has a login email assigned and the owner typed a
  // new password. In that case we ask for explicit confirmation before
  // sending the request, since the change is irreversible for the artist
  // (their old password stops working immediately).
  const isOverwritingExistingPassword = Boolean(
    editingArtist?.login_email && form.password.trim().length > 0
  );

  const submitArtist = async () => {
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
      setShowPasswordConfirm(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isOverwritingExistingPassword) {
      // Don't submit yet — show the confirmation modal first.
      setShowPasswordConfirm(true);
      return;
    }

    await submitArtist();
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

  const handleBulkStatus = async (newStatus: 'active' | 'paused') => {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from('artists')
      .update({ status: newStatus })
      .in('id', selectedIds);

    if (error) {
      setError(error.message);
    } else {
      setSelectedIds([]);
      await loadArtists();
    }
    setLoading(false);
  };

  const handleBulkDelete = async () => {
    const selectedArtists = artists.filter((a) => selectedIds.includes(a.id));
    const names = selectedArtists.map((a) => a.full_name).join(', ');

    if (
      !window.confirm(
        `¿Eliminar a los siguientes tatuadores: ${names}? Si alguno tiene consentimientos asociados, la base de datos bloqueará el borrado para no romper el historial.`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);

    const failedDeletes: string[] = [];

    await Promise.all(
      selectedIds.map(async (id) => {
        try {
          const response = await fetch(`/api/artists/${id}`, { method: 'DELETE' });
          if (!response.ok) {
            const artistName = artists.find((a) => a.id === id)?.full_name || id;
            const errDetail = await parseApiError(response);
            failedDeletes.push(`${artistName}: ${errDetail}`);
          }
        } catch (err) {
          const artistName = artists.find((a) => a.id === id)?.full_name || id;
          failedDeletes.push(`${artistName}: Error de conexión`);
        }
      })
    );

    if (failedDeletes.length > 0) {
      setError(`No se pudieron eliminar algunos tatuadores:\n${failedDeletes.join('\n')}`);
    }

    setSelectedIds([]);
    await loadArtists();
  };

  const openBulkEdit = () => {
    setBulkEditForm({
      qualification: '',
      drive_folder_id: '',
      status: 'active',
      updateQualification: false,
      updateDriveFolder: false,
      updateStatus: false,
    });
    setShowBulkEditModal(true);
  };

  const handleBulkEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updates: any = {};
    let hasUpdates = false;

    if (bulkEditForm.updateQualification) {
      updates.qualification = bulkEditForm.qualification;
      hasUpdates = true;
    }
    if (bulkEditForm.updateDriveFolder) {
      updates.drive_folder_id = bulkEditForm.drive_folder_id || null;
      hasUpdates = true;
    }
    if (bulkEditForm.updateStatus) {
      updates.status = bulkEditForm.status;
      hasUpdates = true;
    }

    if (!hasUpdates) {
      setError('No seleccionaste ningún campo para actualizar en lote.');
      setShowBulkEditModal(false);
      return;
    }

    setSaving(true);
    setError(null);

    const { error } = await supabase
      .from('artists')
      .update(updates)
      .in('id', selectedIds);

    if (error) {
      setError(error.message);
    } else {
      setShowBulkEditModal(false);
      setSelectedIds([]);
      await loadArtists();
    }
    setSaving(false);
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
        <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-xl whitespace-pre-line">
          {error}
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950 text-white p-4 rounded-2xl animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider">
              {selectedIds.length} {selectedIds.length === 1 ? 'tatuador seleccionado' : 'tatuadores seleccionados'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openBulkEdit}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-700 transition-all cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Editar
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatus('active')}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-700 transition-all text-emerald-400 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" />
              Activar
            </button>
            <button
              type="button"
              onClick={() => handleBulkStatus('paused')}
              className="flex items-center gap-1.5 px-3 py-2 bg-zinc-800 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-700 transition-all text-amber-400 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              Pausar
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-950 text-red-400 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-red-900 transition-all border border-red-800/30 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Eliminar
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="p-2 text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Cancelar selección"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
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
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={artists.length > 0 && selectedIds.length === artists.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(artists.map((a) => a.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                  />
                </th>
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
                  <td className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(artist.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, artist.id]);
                        } else {
                          setSelectedIds(selectedIds.filter((id) => id !== artist.id));
                        }
                      }}
                      className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                    />
                  </td>
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
                {isOverwritingExistingPassword && (
                  <p className="text-[11px] font-medium text-amber-700">
                    Este tatuador ya tiene acceso configurado. Al guardar te vamos a pedir confirmación antes de reemplazar su contraseña.
                  </p>
                )}
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

      {showPasswordConfirm && editingArtist && (
        <div className="fixed inset-0 z-[60] bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <KeyRound className="w-5 h-5" />
              <h3 className="font-sans font-extrabold text-sm text-zinc-950">Este usuario ya tiene contraseña asignada</h3>
            </div>
            <p className="text-xs text-zinc-600 leading-relaxed">
              <span className="font-semibold">{editingArtist.full_name}</span> ya puede acceder con{' '}
              <span className="font-semibold">{editingArtist.login_email}</span> y una contraseña existente.
              Si confirmás, esa contraseña se va a reemplazar por la nueva y dejará de funcionar de inmediato.
              ¿Estás seguro de que deseas proceder?
            </p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowPasswordConfirm(false)}
                disabled={saving}
                className="flex-1 border border-zinc-200 bg-white text-zinc-700 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submitArtist}
                disabled={saving}
                className="flex-1 bg-amber-600 text-white py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-amber-700 disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Sí, reemplazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk edit modal */}
      {showBulkEditModal && (
        <div className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center p-5">
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-sans font-extrabold text-sm text-zinc-950">
                Editar {selectedIds.length} tatuadores en lote
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkEditModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBulkEditSubmit} className="space-y-4">
              <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-3 text-xs text-zinc-600">
                Marcá la casilla del campo que deseás actualizar para todos los tatuadores seleccionados.
              </div>

              {/* Qualification */}
              <div className="space-y-2 border border-zinc-100 rounded-xl p-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bulkEditForm.updateQualification}
                    onChange={(e) =>
                      setBulkEditForm({ ...bulkEditForm, updateQualification: e.target.checked })
                    }
                    className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                  />
                  <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                    Actualizar Licencia / Titulación
                  </span>
                </label>
                {bulkEditForm.updateQualification && (
                  <input
                    type="text"
                    value={bulkEditForm.qualification}
                    onChange={(e) =>
                      setBulkEditForm({ ...bulkEditForm, qualification: e.target.value })
                    }
                    required
                    placeholder="Licencia de tatuador/a"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  />
                )}
              </div>

              {/* Drive Folder ID */}
              <div className="space-y-2 border border-zinc-100 rounded-xl p-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bulkEditForm.updateDriveFolder}
                    onChange={(e) =>
                      setBulkEditForm({ ...bulkEditForm, updateDriveFolder: e.target.checked })
                    }
                    className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                  />
                  <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                    Actualizar ID carpeta Drive
                  </span>
                </label>
                {bulkEditForm.updateDriveFolder && (
                  <input
                    type="text"
                    value={bulkEditForm.drive_folder_id}
                    onChange={(e) =>
                      setBulkEditForm({ ...bulkEditForm, drive_folder_id: e.target.value })
                    }
                    placeholder="ID de carpeta (opcional)"
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  />
                )}
              </div>

              {/* Status */}
              <div className="space-y-2 border border-zinc-100 rounded-xl p-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={bulkEditForm.updateStatus}
                    onChange={(e) =>
                      setBulkEditForm({ ...bulkEditForm, updateStatus: e.target.checked })
                    }
                    className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                  />
                  <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">
                    Actualizar Estado
                  </span>
                </label>
                {bulkEditForm.updateStatus && (
                  <select
                    value={bulkEditForm.status}
                    onChange={(e) =>
                      setBulkEditForm({
                        ...bulkEditForm,
                        status: e.target.value as 'active' | 'paused',
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                  >
                    <option value="active">Activo</option>
                    <option value="paused">Pausado</option>
                  </select>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkEditModal(false)}
                  className="flex-1 border border-zinc-200 bg-white text-zinc-700 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 bg-zinc-950 text-white py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-800 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Aplicar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
