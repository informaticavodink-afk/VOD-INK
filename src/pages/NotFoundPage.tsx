import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">
      {/* Header */}
      <header className="px-8 py-6">
        <div>
          <span className="font-black tracking-tight text-zinc-950 text-xl">VOD INK</span>
          <p className="font-mono text-xs tracking-widest text-zinc-400 uppercase mt-0.5">
            Cantabria • Est. 2024
          </p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-8">
        <div className="text-center max-w-md">
          <p className="font-mono text-xs tracking-widest text-zinc-400 uppercase mb-6">
            Página no encontrada
          </p>

          <h1 className="text-[9rem] font-black leading-none tracking-tighter text-zinc-950 select-none">
            404
          </h1>

          <p className="mt-6 text-zinc-500 text-base leading-relaxed">
            La página que estás buscando no existe o fue movida. Volvé al inicio para continuar.
          </p>

          <button
            onClick={() => navigate('/')}
            className="mt-10 inline-flex items-center justify-center bg-zinc-950 text-white px-8 py-3.5 text-sm font-semibold tracking-wide hover:bg-zinc-800 transition-colors duration-150"
          >
            Volver al inicio
          </button>
        </div>
      </main>

      {/* Footer line */}
      <div className="h-px bg-zinc-200 mx-8 mb-8" />
    </div>
  );
}
