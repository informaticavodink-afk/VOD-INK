/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/src/types/supabase';
import { Download, FileCheck2, Loader2, Search, X } from 'lucide-react';
import SensitiveText from '@/src/components/SensitiveText';
import DatePicker from '@/src/components/DatePicker';
import JSZip from 'jszip';

type Consent = Database['public']['Tables']['consents']['Row'];

type ConsentWithArtist = Consent & { artists: { full_name: string } | null };

interface ConsentsManagerProps {
  studioId: string;
}

function getConsentStatusLabel(status: Consent['status']) {
  switch (status) {
    case 'signed':
      return 'Completado';
    case 'pending_technique':
      return 'Pendiente de intervención';
    case 'pending_artist':
      return 'Pendiente de firma';
    case 'upload_error':
      return 'Error de archivo';
    case 'cancelled':
      return 'Cancelado';
    default:
      return 'Borrador';
  }
}


export default function ConsentsManager({ studioId }: ConsentsManagerProps) {
  const [consents, setConsents] = useState<ConsentWithArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // States for bulk select and ZIP compression
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zipping, setZipping] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const loadConsents = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    setSelectedIds([]); // Clear selection when loading
    const { data, error } = await supabase
      .from('consents')
      .select('*, artists:artists!consents_artist_studio_fkey(full_name)')
      .eq('studio_id', studioId)
      .order('created_at', { ascending: false });

    if (error) {
      setError(error.message);
    } else {
      setConsents(data || []);
    }
    setLoading(false);
  }, [studioId, supabase]);

  // react-doctor-disable-next-line effect-needs-cleanup -- Supabase channel is explicitly unsubscribed below.
  useEffect(() => {
    loadConsents();

    const channel = supabase
      .channel('admin-consents-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'consents',
          filter: `studio_id=eq.${studioId}`,
        },
        () => {
          loadConsents();
        }
      )
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          console.warn('[Realtime ConsentsManager] canal en estado', status);
        }
      });

    return () => {
      void channel.unsubscribe();
    };
  }, [loadConsents, studioId, supabase]);

  const downloadPdf = async (consent: ConsentWithArtist) => {
    if (!consent.final_file_id) {
      setError('Este consentimiento no tiene un PDF final disponible');
      return;
    }

    const { data, error } = await supabase
      .from('consent_files')
      .select('storage_path')
      .eq('id', consent.final_file_id)
      .eq('document_kind', 'final')
      .single();

    if (error || !data) {
      setError('No se encontró el archivo PDF');
      return;
    }

    const { data: signedData, error: signedError } = await supabase.storage
      .from('consent-pdfs')
      .createSignedUrl(data.storage_path, 60);

    if (signedError || !signedData) {
      setError('Error al generar enlace de descarga');
      return;
    }

    window.open(signedData.signedUrl, '_blank');
  };

  const zipAndDownloadConsents = async (consentsToZip: ConsentWithArtist[]) => {
    const signedConsents = consentsToZip.filter((consent) => consent.status === 'signed' && consent.final_file_id);
    const totalCount = consentsToZip.length;
    const signedCount = signedConsents.length;

    setError(null);
    setSuccessMessage(null);

    if (signedCount === 0) {
      setError('No hay consentimientos con un PDF final disponible para exportar.');
      return;
    }

    setZipping(true);

    try {
      // 1. Get storage paths for selected consents
      const finalFileIds = signedConsents
        .map((consent) => consent.final_file_id)
        .filter((id): id is string => Boolean(id));

      const { data: files, error: filesError } = await supabase
        .from('consent_files')
        .select('id, consent_id, storage_path')
        .in('id', finalFileIds)
        .eq('document_kind', 'final');

      if (filesError || !files || files.length === 0) {
        throw new Error(filesError?.message || 'No se encontraron archivos asociados a los consentimientos seleccionados.');
      }

      const zip = new JSZip();

      // 2. Download files in parallel
      const downloadPromises = files.map(async (file) => {
        const consent = signedConsents.find((c) => c.id === file.consent_id);
        if (!consent) return;

        const dateStr = new Date(consent.created_at).toISOString().split('T')[0];
        // Clean client name for safe filenames
        const clientNameClean = consent.client_full_name
          .trim()
          .replace(/[\/\\?%*:|"<>]/g, '_'); // Replace invalid characters
        const filename = `Consentimiento_${clientNameClean}_${dateStr}_${consent.id.slice(0, 8)}.pdf`;

        const { data, error } = await supabase.storage
          .from('consent-pdfs')
          .download(file.storage_path);

        if (error || !data) {
          console.error(`Error descargando ${filename}:`, error);
          return; // Skip if fails, continue with others
        }

        zip.file(filename, data);
      });

      await Promise.all(downloadPromises);

      // 3. Generate ZIP and download
      const content = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Consentimientos_VOD_INK_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      if (signedCount < totalCount) {
        setSuccessMessage(`Se exportaron ${signedCount} de los ${totalCount} consentimientos. Los ${totalCount - signedCount} restantes se omitieron por estar incompletos (sin PDF).`);
      } else {
        setSuccessMessage(`Se exportaron los ${signedCount} consentimientos completados correctamente en un archivo ZIP.`);
      }

      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al generar el archivo ZIP');
    } finally {
      setZipping(false);
    }
  };

  const downloadBulkZip = () => {
    const selectedConsents = consents.filter((c) => selectedIds.includes(c.id));
    zipAndDownloadConsents(selectedConsents);
  };

  const downloadAllZip = () => {
    zipAndDownloadConsents(filtered);
  };

  const filtered = consents.filter((c) => {
    const createdAt = new Date(c.created_at);
    const matchesText =
      c.client_full_name.toLowerCase().includes(filter.toLowerCase()) ||
      c.client_dni.toLowerCase().includes(filter.toLowerCase()) ||
      c.artists?.full_name.toLowerCase().includes(filter.toLowerCase());
    const matchesFrom = fromDate ? createdAt >= new Date(`${fromDate}T00:00:00`) : true;
    const matchesTo = toDate ? createdAt <= new Date(`${toDate}T23:59:59`) : true;

    return matchesText && matchesFrom && matchesTo;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-sans text-2xl font-black tracking-tight">Consentimientos</h2>
        </div>
        <button
          type="button"
          onClick={downloadAllZip}
          disabled={zipping || filtered.filter((c) => c.status === 'signed').length === 0}
          className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-950 px-4 py-3 text-xs font-black uppercase tracking-wider text-white transition-all hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {zipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Exportar todos (ZIP)
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-xl">{error}</div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs p-3 rounded-xl flex items-center justify-between animate-fadeIn">
          <span>{successMessage}</span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950 text-white p-4 rounded-2xl animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider">
              {selectedIds.length} {selectedIds.length === 1 ? 'consentimiento seleccionado' : 'consentimientos seleccionados'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={downloadBulkZip}
              disabled={zipping}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-60"
            >
              {zipping ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Comprimiendo...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  Exportar ZIP
                </>
              )}
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
        <div className="rounded-[28px] border border-purple-200 bg-white p-3 shadow-sm">
          <div className="grid gap-3 border-b border-zinc-100 p-3 md:grid-cols-[1.3fr_1fr_1fr] items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtros de búsqueda"
                className="w-full rounded-xl border border-zinc-200 !py-2.5 !pl-9 !pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
              />
            </div>

            <div>
              <DatePicker
                value={fromDate}
                onChange={setFromDate}
                placeholder="Fecha desde"
              />
            </div>

            <div>
              <DatePicker
                value={toDate}
                onChange={setToDate}
                placeholder="Fecha hasta"
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-zinc-100">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr>
                <th className="w-10 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filtered.map((c) => c.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Cliente</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Estado</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Tatuador</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">Fecha</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500">DNI</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-zinc-500 text-right">Fichero</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.map((consent) => (
                <tr key={consent.id} className="hover:bg-zinc-50/50">
                  <td className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(consent.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, consent.id]);
                        } else {
                          setSelectedIds(selectedIds.filter((id) => id !== consent.id));
                        }
                      }}
                      className="rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950 cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <SensitiveText>{consent.client_full_name}</SensitiveText>
                  </td>
                  <td className="px-4 py-3">
                    <SensitiveText>
                      <span
                        className={`inline-flex px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${
                          consent.status === 'signed'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : consent.status === 'pending_technique'
                            ? 'bg-purple-50 text-purple-700 border-purple-100'
                            : consent.status === 'pending_artist'
                            ? 'bg-amber-50 text-amber-700 border-amber-100'
                            : consent.status === 'upload_error'
                            ? 'bg-red-50 text-red-700 border-red-100'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                        }`}
                      >
                        {getConsentStatusLabel(consent.status)}
                      </span>
                    </SensitiveText>
                  </td>
                  <td className="px-4 py-3 text-zinc-500">
                    <SensitiveText>{consent.artists?.full_name || '—'}</SensitiveText>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    <SensitiveText>{new Date(consent.created_at).toLocaleString('es-ES')}</SensitiveText>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 font-mono text-xs">
                    <SensitiveText>{consent.client_dni}</SensitiveText>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <SensitiveText>
                      {consent.status === 'signed' && consent.final_file_id ? (
                        <button
                          type="button"
                          onClick={() => downloadPdf(consent)}
                          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-zinc-700 transition-all hover:bg-zinc-100"
                          title="Ver o descargar PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Ver / descargar
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-amber-700">
                          <FileCheck2 className="w-3.5 h-3.5" />
                          Incompleto
                        </span>
                      )}
                    </SensitiveText>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-zinc-400 text-xs font-medium">No hay consentimientos.</div>
          )}
        </div>
      )}
    </div>
  );
}
