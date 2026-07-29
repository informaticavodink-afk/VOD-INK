import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Save, ShieldCheck } from 'lucide-react';
import {
  EMPTY_STUDIO_FORM,
  fetchStudioSettings,
  saveStudioSettings,
  studioToForm,
  todayInMadrid,
  type Studio,
  type StudioForm,
} from '@/src/lib/studioSettingsClient';

const fieldClass =
  'mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10';
const labelClass = 'text-xs font-bold uppercase tracking-wide text-zinc-600';

export default function StudioSettingsManager() {
  const [studio, setStudio] = useState<Studio | null>(null);
  const [form, setForm] = useState<StudioForm>(EMPTY_STUDIO_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmHealth, setConfirmHealth] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const loadedStudio = await fetchStudioSettings();
        if (!active) return;
        setStudio(loadedStudio);
        setForm(studioToForm(loadedStudio));
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar el estudio.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const healthChanged = useMemo(() => {
    if (!studio) return false;
    return (
      form.health_registration_number.trim() !== (studio.health_registration_number ?? '').trim()
      || form.health_authorization_date !== (studio.health_authorization_date ?? '')
    );
  }, [form.health_authorization_date, form.health_registration_number, studio]);

  const canAttest = Boolean(
    form.health_registration_number.trim() && form.health_authorization_date
  );

  const setField = (field: keyof StudioForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setSuccess(null);
    if (field === 'health_registration_number' || field === 'health_authorization_date') {
      setConfirmHealth(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const savedStudio = await saveStudioSettings(form, confirmHealth);
      setStudio(savedStudio);
      setForm(studioToForm(savedStudio));
      setConfirmHealth(false);
      setSuccess(
        savedStudio.health_data_verified_at
          ? 'Datos del estudio guardados y estado sanitario confirmado.'
          : 'Datos del estudio guardados. La confirmación sanitaria sigue pendiente.'
      );
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo guardar el estudio.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-zinc-900">Datos del estudio</h2>
        <p className="mt-1 max-w-3xl text-sm text-zinc-600">
          Esta información identifica al establecimiento y aparece en los consentimientos.
          Sólo propietarios y administradores pueden modificarla.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <h3 className="font-black text-zinc-900">Identificación y contacto</h3>
            <p className="mt-1 text-xs text-zinc-500">Todos estos campos son obligatorios.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className={labelClass}>
              Razón social
              <input
                required
                maxLength={160}
                className={fieldClass}
                value={form.legal_name}
                onChange={(event) => setField('legal_name', event.target.value)}
              />
            </label>
            <label className={labelClass}>
              Nombre comercial
              <input
                required
                maxLength={160}
                className={fieldClass}
                value={form.trade_name}
                onChange={(event) => setField('trade_name', event.target.value)}
              />
            </label>
            <label className={labelClass}>
              CIF/NIF
              <input
                required
                maxLength={40}
                className={fieldClass}
                value={form.tax_id}
                onChange={(event) => setField('tax_id', event.target.value)}
              />
            </label>
            <label className={labelClass}>
              Teléfono
              <input
                required
                inputMode="tel"
                maxLength={40}
                className={fieldClass}
                value={form.phone}
                onChange={(event) => setField('phone', event.target.value)}
              />
            </label>
            <label className={`${labelClass} md:col-span-2`}>
              Domicilio
              <input
                required
                maxLength={240}
                className={fieldClass}
                value={form.address}
                onChange={(event) => setField('address', event.target.value)}
              />
            </label>
            <label className={labelClass}>
              Localidad
              <input
                required
                maxLength={120}
                className={fieldClass}
                value={form.city}
                onChange={(event) => setField('city', event.target.value)}
              />
            </label>
            <label className={labelClass}>
              Código postal
              <input
                required
                inputMode="numeric"
                maxLength={20}
                className={fieldClass}
                value={form.postal_code}
                onChange={(event) => setField('postal_code', event.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="font-black text-zinc-900">Autorización sanitaria</h3>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-zinc-500">
                Copiá estos datos exactamente desde la autorización oficial. Sin confirmación,
                la firma final de nuevos consentimientos permanece bloqueada.
              </p>
            </div>
            {studio?.health_data_verified_at && !healthChanged ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Confirmado
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-2 text-xs font-bold text-amber-900">
                <AlertTriangle className="h-4 w-4" />
                Pendiente
              </span>
            )}
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className={labelClass}>
              Número de registro sanitario
              <input
                maxLength={120}
                className={fieldClass}
                value={form.health_registration_number}
                onChange={(event) => setField('health_registration_number', event.target.value)}
              />
            </label>
            <label className={labelClass}>
              Fecha de autorización
              <input
                type="date"
                max={todayInMadrid()}
                className={fieldClass}
                value={form.health_authorization_date}
                onChange={(event) => setField('health_authorization_date', event.target.value)}
              />
            </label>
          </div>

          <label className={`mt-5 flex items-start gap-3 rounded-xl border p-4 ${
            canAttest ? 'cursor-pointer border-zinc-200 bg-zinc-50' : 'border-zinc-100 bg-zinc-50/60 text-zinc-400'
          }`}>
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-zinc-950"
              disabled={!canAttest}
              checked={confirmHealth}
              onChange={(event) => setConfirmHealth(event.target.checked)}
            />
            <span className="text-sm leading-relaxed">
              Confirmo que el número y la fecha coinciden con la autorización sanitaria oficial
              vigente del estudio.
            </span>
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 px-5 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmHealth ? <ShieldCheck className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {confirmHealth ? 'Guardar y confirmar' : 'Guardar datos'}
          </button>
        </div>
      </form>
    </section>
  );
}
