/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ChangePasswordForm() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess('Tu contraseña se actualizó correctamente.');
      setPassword('');
      setConfirmPassword('');
    }

    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-900">
          <KeyRound className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-sans font-bold text-lg text-zinc-900">
            Cambiar Contraseña
          </h2>
          <p className="font-sans text-xs text-zinc-500">
            Actualiza tu contraseña para acceder a la plataforma de forma segura
          </p>
        </div>
      </div>

      <hr className="border-zinc-100" />

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div className="space-y-1">
          <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">
            Nueva contraseña
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
            placeholder="Mínimo 6 caracteres"
          />
        </div>

        <div className="space-y-1">
          <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">
            Confirmar nueva contraseña
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
            placeholder="Repetí la contraseña"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-4 rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs p-4 rounded-xl flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-zinc-950 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Actualizar contraseña
        </button>
      </form>
    </div>
  );
}
