/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { AuthError } from '@supabase/supabase-js';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginFormProps {
  onLogin?: () => void;
}

function getLoginErrorMessage(error: AuthError) {
  if (error.status === 500) {
    return 'Supabase Auth devolvió un error interno (500). La base de datos/esquema de Auth no está respondiendo correctamente. Revisa la conexión de la DB en Supabase y los logs de Auth.';
  }

  if (error.message === 'Invalid login credentials') {
    return 'Correo o contraseña incorrectos.';
  }

  if (!error.message || error.message === '{}') {
    return `No se pudo iniciar sesión. Detalle técnico: ${error.name}${error.status ? ` (${error.status})` : ''}`;
  }

  return error.message;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      console.error('[LoginForm] Error al iniciar sesión:', error);
      setError(getLoginErrorMessage(error));
    } else if (onLogin) {
      onLogin();
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
      <div className="max-w-sm w-full bg-white border border-zinc-200 p-8 rounded-3xl shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-sans font-extrabold text-xl text-zinc-950 tracking-tight">
            VOD INK Admin
          </h1>
          <p className="font-sans text-xs text-zinc-500">
            Acceso para propietarios y tatuadores
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
              placeholder="Correo"
            />
          </div>

          <div className="space-y-1">
            <label className="font-sans text-[10px] font-bold uppercase tracking-wider text-zinc-700">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pr-12 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950"
                placeholder="Contraseña"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-950"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-zinc-950 text-white text-sm font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
