import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import SensitiveText from '@/src/components/SensitiveText';
import type { Database } from '@/src/types/supabase';

type Consent = Database['public']['Tables']['consents']['Row'];
type ConsentWithStudio = Consent & { studios: { trade_name: string } | null };

interface ArtistConsentDetailsModalProps {
  isOpen: boolean;
  consent: ConsentWithStudio | null;
  isDiscarding: boolean;
  error?: string | null;
  onClose: () => void;
  onConfirmDiscard: (consent: ConsentWithStudio) => Promise<void>;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-ES');
}

function ReadOnlyField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="space-y-1 rounded-2xl border border-zinc-100 bg-zinc-50/70 p-4">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">{label}</span>
      <span className="block text-sm font-medium text-zinc-900">
        <SensitiveText>{value || '—'}</SensitiveText>
      </span>
    </div>
  );
}

export default function ArtistConsentDetailsModal({
  isOpen,
  consent,
  isDiscarding,
  error,
  onClose,
  onConfirmDiscard,
}: ArtistConsentDetailsModalProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    setIsConfirmOpen(false);
  }, [isOpen, consent?.id]);

  const isDiscardable = consent?.status === 'pending_artist' || consent?.status === 'pending_technique';
  const healthFlags = useMemo(
    () =>
      Array.isArray(consent?.health_flags)
        ? consent.health_flags.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        : [],
    [consent]
  );

  const handleDiscard = async () => {
    if (!consent) return;

    try {
      await onConfirmDiscard(consent);
      setIsConfirmOpen(false);
    } catch {
      // El error visible lo maneja el padre.
    }
  };

  if (!isOpen || !consent) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 backdrop-blur-sm p-4 animate-fadeIn">
        <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-[32px] border border-zinc-100 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-zinc-100 p-6">
            <div className="space-y-1">
              <span className="block font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-400">
                Solo lectura
              </span>
              <h3 className="font-sans text-xl font-extrabold tracking-tight text-zinc-950">Revisar datos del cliente</h3>
              <p className="text-xs text-zinc-500">
                Verificá los datos antes de continuar con la firma.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600 cursor-pointer"
              aria-label="Cerrar vista previa"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-6 overflow-y-auto bg-zinc-50/40 p-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Estado</span>
                <span className="mt-2 inline-flex rounded-md border border-amber-100 bg-amber-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
                  <SensitiveText>
                    {consent.status === 'pending_artist' || consent.status === 'pending_technique'
                      ? 'Pendiente de firma'
                      : consent.status === 'signed'
                      ? 'Firmado'
                      : consent.status === 'cancelled'
                      ? 'Cancelado'
                      : consent.status === 'upload_error'
                      ? 'Error de archivo'
                      : 'Borrador'}
                  </SensitiveText>
                </span>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Fecha</span>
                <span className="mt-2 block text-sm font-medium text-zinc-900">
                  <SensitiveText>{formatDate(consent.created_at)}</SensitiveText>
                </span>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Estudio</span>
                <span className="mt-2 block text-sm font-medium text-zinc-900">
                  <SensitiveText>{consent.studios?.trade_name || '—'}</SensitiveText>
                </span>
              </div>
            </div>

            <section className="space-y-3">
              <div>
                <span className="block font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-400">Cliente</span>
                <h4 className="mt-1 text-base font-extrabold text-zinc-950">Datos personales</h4>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <ReadOnlyField label="Nombre y apellidos" value={consent.client_full_name} />
                <ReadOnlyField label="DNI" value={consent.client_dni} />
                <ReadOnlyField label="Fecha de nacimiento" value={formatDate(consent.client_birth_date)} />
                <ReadOnlyField label="Teléfono" value={consent.client_phone} />
                <ReadOnlyField label="Domicilio" value={consent.client_address} />
                <ReadOnlyField label="Código postal" value={consent.client_postal_code} />
                <ReadOnlyField label="Localidad" value={consent.client_city} />
              </div>
            </section>

            {consent.is_minor && (
              <section className="space-y-3">
                <div>
                  <span className="block font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-400">Representante legal</span>
                  <h4 className="mt-1 text-base font-extrabold text-zinc-950">Datos del representante</h4>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <ReadOnlyField label="Nombre y apellidos" value={consent.representative_full_name} />
                  <ReadOnlyField label="DNI" value={consent.representative_dni} />
                  <ReadOnlyField label="Fecha de nacimiento" value={formatDate(consent.representative_birth_date)} />
                  <ReadOnlyField label="Teléfono" value={consent.representative_phone} />
                  <ReadOnlyField label="Domicilio" value={consent.representative_address} />
                  <ReadOnlyField label="Código postal" value={consent.representative_postal_code} />
                  <ReadOnlyField label="Localidad" value={consent.representative_city} />
                  <ReadOnlyField label="Parentesco" value={consent.representative_relationship} />
                  <ReadOnlyField label="Acreditación" value={consent.representative_accreditation} />
                </div>
              </section>
            )}

            <section className="space-y-3">
              <div>
                <span className="block font-mono text-[9px] font-bold uppercase tracking-widest text-zinc-400">Declaración de salud</span>
                <h4 className="mt-1 text-base font-extrabold text-zinc-950">Indicaciones marcadas</h4>
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                {healthFlags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {healthFlags.map((flag) => (
                      <span
                        key={flag}
                        className="inline-flex rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-[11px] font-semibold text-zinc-700"
                      >
                        <SensitiveText>{flag}</SensitiveText>
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-zinc-500">No hay observaciones declaradas.</span>
                )}
              </div>
            </section>

            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-700 transition-all hover:bg-zinc-50 cursor-pointer"
            >
              Cerrar
            </button>

            {isDiscardable && (
              <button
                type="button"
                onClick={() => setIsConfirmOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-red-600 transition-all hover:bg-red-100 cursor-pointer"
              >
                <AlertTriangle className="h-4 w-4" />
                Descartar consentimiento
              </button>
            )}
          </div>
        </div>
      </div>

      {isConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-zinc-950/55 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-[28px] border border-zinc-100 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-extrabold tracking-tight text-zinc-950">Confirmar descarte</h4>
                <p className="text-sm text-zinc-500">
                  Vas a marcar este consentimiento como cancelado para que salga de pendientes.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm text-zinc-700">
              <div className="space-y-1">
                <p>
                  Cliente:{' '}
                  <strong className="text-zinc-950">
                    <SensitiveText>{consent.client_full_name}</SensitiveText>
                  </strong>
                </p>
                <p>
                  DNI:{' '}
                  <strong className="text-zinc-950">
                    <SensitiveText>{consent.client_dni}</SensitiveText>
                  </strong>
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">{error}</div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isDiscarding}
                className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-xs font-black uppercase tracking-wider text-zinc-700 transition-all hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isDiscarding}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-red-600 transition-all hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
              >
                {isDiscarding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Descartando...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    Sí, descartar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
