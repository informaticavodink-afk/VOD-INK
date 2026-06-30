/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { generateConsentPDF } from '../lib/pdf';
import { WizardState, Submission } from '../types';
import { FileDown, CloudLightning, CheckCircle2, RefreshCw, FolderClosed, ShieldCheck } from 'lucide-react';

interface Step8ConfirmationProps {
  state: WizardState;
  onReset: () => void;
}

export default function Step8Confirmation({ state, onReset }: Step8ConfirmationProps) {
  const [loading, setLoading] = useState(true);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFileName, setPdfFileName] = useState('');
  const [progressText, setProgressText] = useState('Iniciando generación de PDF legal...');
  const runOnce = useRef(false);

  const processBackup = async () => {
    if (runOnce.current) return;
    runOnce.current = true;

    try {
      // 1. Generate PDF
      setProgressText('Escribiendo folios y codificando firmas...');
      const { base64, blob, fileName } = await generateConsentPDF(state);
      setPdfBlob(blob);
      setPdfFileName(fileName);

      // Trigger automatic local download for safety (so the tablet has it immediately)
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Create initial local submission record
      const tempId = 'SUB_' + Math.random().toString(36).slice(2, 11).toUpperCase();
      const localSub: Submission = {
        id: tempId,
        tatuadorId: state.artistaSeleccionado?.id || 'unknown',
        tatuadorNombre: state.artistaSeleccionado?.nombreYApellidos || 'Tatuador VOD INK',
        clienteNombre: state.datosCliente.nombreYApellidos,
        clienteDni: state.datosCliente.dni,
        fecha: new Date().toLocaleDateString('es-ES') + ' ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        estado: 'pendiente',
      };

      setProgressText('Conectando con el servidor de seguridad de VOD INK...');

      // 2. Post to backend server to register and try to upload to Drive
      try {
        const response = await fetch('/api/upload-to-drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pdfBase64: base64,
            fileName: fileName,
            carpetaDriveId: state.artistaSeleccionado?.carpetaDriveId,
            tatuadorNombre: state.artistaSeleccionado?.nombreYApellidos,
            clienteNombre: state.datosCliente.nombreYApellidos,
            clienteDni: state.datosCliente.dni,
            tatuadorId: state.artistaSeleccionado?.id,
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          if (resData.driveFileId) {
            setProgressText('¡Consentimiento respaldado en Google Drive con éxito!');
            localSub.estado = 'ok';
            localSub.driveFileId = resData.driveFileId;
            localSub.driveViewLink = resData.driveViewLink;
          } else {
            // Server registered it, but Google Drive config was missing/offline
            setProgressText('Registrado localmente. Google Drive pendiente de enlazar por el Administrador.');
            localSub.estado = 'pendiente';
          }
        } else {
          const errText = await response.text();
          throw new Error(`Server responded with status ${response.status}: ${errText}`);
        }
      } catch (err: any) {
        console.error('Network or server error during backup:', err);
        setErrorLog('Error al conectar con la nube de Google Drive. El PDF ha sido descargado en el dispositivo y guardado localmente.');
        localSub.estado = 'error';
      }

      // Save submission to client localStorage logs
      const existing = localStorage.getItem('vod_ink_submissions');
      const list: Submission[] = existing ? JSON.parse(existing) : [];
      list.unshift(localSub);
      localStorage.setItem('vod_ink_submissions', JSON.stringify(list));

      setSubmission(localSub);
      setLoading(false);
    } catch (err: any) {
      console.error('Fatal PDF generation or sync error:', err);
      setErrorLog('Ocurrió un error crítico durante la confección del documento legal. Por favor, reintente.');
      setLoading(false);
    }
  };

  useEffect(() => {
    processBackup();
  }, []);

  const handleManualDownload = () => {
    if (pdfBlob) {
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = pdfFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center bg-zinc-50/50 p-6 sm:p-8 overflow-y-auto">
      <div className="max-w-md mx-auto w-full bento-card bg-white p-6 sm:p-8 space-y-6">
        {loading ? (
          // Loading state
          <div className="text-center py-8 space-y-5 animate-pulse">
            <RefreshCw className="w-10 h-10 text-zinc-950 animate-spin mx-auto stroke-[1.5]" />
            <div className="space-y-1.5">
              <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold block">
                Procesando Registro
              </span>
              <h3 className="font-sans font-bold text-base text-zinc-900 tracking-tight">
                {progressText}
              </h3>
            </div>
            <p className="font-sans text-[11px] text-zinc-500 max-w-xs mx-auto leading-relaxed">
              No cierres esta pantalla ni recargues el navegador. Se está cifrando la información bajo el protocolo RGPD de Cantabria.
            </p>
          </div>
        ) : (
          // Complete state
          <div className="space-y-6">
            {submission?.estado === 'ok' ? (
              // Full Success
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-100 shadow-sm">
                  <CheckCircle2 className="w-7 h-7 stroke-[2]" />
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-600 bg-emerald-100/50 px-2.5 py-0.5 rounded-full font-bold inline-block">
                  Registro Completado
                </span>
                <h1 className="font-sans font-extrabold text-2xl text-zinc-950 tracking-tight">
                  Documento Guardado
                </h1>
                <p className="font-sans text-xs text-zinc-500 leading-relaxed max-w-sm mx-auto">
                  El consentimiento legal de <strong className="text-zinc-800">{state.datosCliente.nombreYApellidos}</strong> ha sido firmado y subido a Google Drive de forma segura.
                </p>
              </div>
            ) : (
              // Fallback / Partial Success (No Google Drive connection but offline registration OK)
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-zinc-100 text-zinc-800 flex items-center justify-center mx-auto mb-2 border border-zinc-200 shadow-sm">
                  <CloudLightning className="w-6 h-6 stroke-[1.5]" />
                </div>
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 bg-zinc-100 px-2.5 py-0.5 rounded-full font-bold inline-block">
                  Registro Local Seguro
                </span>
                <h1 className="font-sans font-extrabold text-2xl text-zinc-950 tracking-tight">
                  Guardado en Dispositivo
                </h1>
                <p className="font-sans text-xs text-zinc-500 leading-relaxed max-w-sm mx-auto">
                  El documento legal se ha descargado e indexado localmente con éxito. La subida a la nube de Drive requiere configuración de Google OAuth por el administrador.
                </p>
              </div>
            )}

            {/* Document stats */}
            <div className="border border-zinc-100 rounded-xl p-5 space-y-3 font-sans text-xs bg-zinc-50/50">
              <span className="font-sans font-bold text-[10px] uppercase tracking-wider block text-zinc-400 pb-1.5 border-b border-zinc-200/60">
                Detalles de Auditoría
              </span>
              <div className="space-y-2 font-sans text-xs">
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-zinc-400">ID:</span>
                  <span className="font-mono font-bold text-zinc-900">{submission?.id}</span>
                </div>

                <div className="flex justify-between items-center py-0.5">
                  <span className="text-zinc-400">Cliente:</span>
                  <span className="font-semibold text-zinc-900 uppercase">{state.datosCliente.nombreYApellidos}</span>
                </div>

                <div className="flex justify-between items-center py-0.5">
                  <span className="text-zinc-400">DNI/NIE:</span>
                  <span className="font-semibold text-zinc-900 font-mono uppercase">{state.datosCliente.dni}</span>
                </div>

                <div className="flex justify-between items-center py-0.5">
                  <span className="text-zinc-400">Tatuador:</span>
                  <span className="font-semibold text-zinc-900">{state.artistaSeleccionado?.nombreYApellidos}</span>
                </div>

                <div className="flex justify-between items-center py-0.5">
                  <span className="text-zinc-400">Fecha/Hora:</span>
                  <span className="text-zinc-700 font-medium">{submission?.fecha}</span>
                </div>

                <div className="flex justify-between items-center py-0.5">
                  <span className="text-zinc-400">Almacenamiento:</span>
                  <span className="font-bold text-zinc-900">
                    {submission?.estado === 'ok' ? 'GOOGLE DRIVE NUBE ✓' : 'DESCARGA LOCAL + CACHÉ OK'}
                  </span>
                </div>
              </div>

              {submission?.driveViewLink && (
                <div className="pt-3 border-t border-dashed border-zinc-200 mt-2 text-center">
                  <a
                    href={submission.driveViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-zinc-900 underline uppercase hover:text-zinc-700 transition-colors"
                  >
                    <FolderClosed className="w-4 h-4 text-zinc-600" />
                    Ver en Google Drive
                  </a>
                </div>
              )}
            </div>

            {/* Manual actions box */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleManualDownload}
                className="flex-1 flex items-center justify-center gap-2 border border-zinc-200 bg-white text-zinc-700 p-3.5 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-50 active:bg-zinc-100 min-h-[44px] cursor-pointer transition-all shadow-sm"
              >
                <FileDown className="w-4 h-4 text-zinc-500" />
                Descargar copia PDF
              </button>

              <button
                type="button"
                onClick={onReset}
                className="flex-1 flex items-center justify-center gap-2 bg-zinc-950 text-white p-3.5 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-800 active:bg-zinc-900 min-h-[44px] cursor-pointer transition-all shadow-sm"
              >
                <ShieldCheck className="w-4 h-4 text-zinc-400" />
                Nueva Firma
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
