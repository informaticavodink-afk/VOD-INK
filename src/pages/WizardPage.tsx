/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Aplicador, Cliente, RepresentanteLegal, Tecnica, WizardState, Submission } from '../types';
import Header from '../components/Header';
import StepFooter from '../components/StepFooter';

// Steps imports
import Step0Artist from '../steps/Step0_Artist';
import Step1Client from '../steps/Step1_Client';
import Step3Legal from '../steps/Step3_Legal';
import Step4Contraindications from '../steps/Step4_Contraindications';
import Step6SignatureClient from '../steps/Step6_SignatureClient';
import { TINTAS_PREDEFINIDAS } from '../lib/config';
import { getOrCreateIdempotencyKey, clearIdempotencyKey, submitConsentToApi } from '../lib/submissions';

// ==========================================
// NOTA IMPORTANTE PARA IA / FUTUROS DESARROLLADORES:
// Los siguientes componentes fueron excluidos temporalmente del flujo del asistente del cliente (wizard).
// NO DEBEN BORRARSE ya que se utilizarán para la vista del Panel de Administración del tatuador:
//
// 1. Step2Technique (Firma/Datos de Intervención) -> './steps/Step2_Technique'
// 2. Step5Price (Presupuesto y Condiciones Financieras) -> './steps/Step5_Price'
// 3. Step7SignatureArtist (Firma del Tatuador/Aplicador) -> './steps/Step7_SignatureArtist'
// ==========================================
// import Step2Technique from './steps/Step2_Technique';
// import Step5Price from './steps/Step5_Price';
// import Step7SignatureArtist from './steps/Step7_SignatureArtist';

import { LEGAL_SECTIONS } from '../lib/legalTexts';
import { ShieldCheck, ShieldAlert, FileSignature, Database, FileClock, RefreshCw } from 'lucide-react';

const INITIAL_CLIENT: Cliente = {
  nombreYApellidos: '',
  dni: '',
  fechaNacimiento: '',
  domicilio: '',
  cp: '',
  localidad: '',
  telefono: '',
};

const INITIAL_REPRESENTATIVE: RepresentanteLegal = {
  nombreYApellidos: '',
  dni: '',
  fechaNacimiento: '',
  domicilio: '',
  cp: '',
  localidad: '',
  telefono: '',
  parentesco: '',
  acreditaMediante: '',
};

const INITIAL_TECHNIQUE: Tecnica = {
  denominacionGenerica: 'Tatuaje',
  localizacionAnatomica: 'Antebrazo izquierdo',
  tintas: [TINTAS_PREDEFINIDAS[0]],
  otrosMateriales: 'Agujas estériles de un solo uso, grip desechable, vaselina filante, film osmótico, jabón syndet.',
  duracion: '1.5 Horas',
  posibilidadesEliminacion: 'Láser Q-Switched / Dermoabrasión (parcial)',
  presupuesto: '150',
};

export default function WizardPage() {
  // -1 is the Privacy Consent Gate, 0 to 8 are the standard Wizard Steps
  const [paso, setPaso] = useState<number>(-1);
  const [direction, setDirection] = useState<number>(1); // 1 = next, -1 = prev
  const [privacyChecked, setPrivacyChecked] = useState<boolean>(false);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [bypassValidation, setBypassValidation] = useState<boolean>(false);

  // Core wizard state
  const [artistaSeleccionado, setArtistaSeleccionado] = useState<Aplicador | null>(null);
  const [datosCliente, setDatosCliente] = useState<Cliente>(INITIAL_CLIENT);
  const [esMenor, setEsMenor] = useState<boolean>(false);
  const [datosRepresentante, setDatosRepresentante] = useState<RepresentanteLegal>(INITIAL_REPRESENTATIVE);
  const [datosTecnica, setDatosTecnica] = useState<Tecnica>(INITIAL_TECHNIQUE);
  const [declaracionLeido, setDeclaracionLeido] = useState<boolean>(false);
  const [declaracionContraindicaciones, setDeclaracionContraindicaciones] = useState<boolean>(false);
  const [declaracionSaludSeleccionadas, setDeclaracionSaludSeleccionadas] = useState<string[]>([]);
  // Nota: Dado que se omitió la pantalla de presupuesto, se establece confirmadoPrecio en true por defecto
  const [confirmadoPrecio, setConfirmadoPrecio] = useState<boolean>(true);
  const [firmaCliente, setFirmaCliente] = useState<string>('');
  const [firmaAplicador, setFirmaAplicador] = useState<string>('');

  // Estados de envío, guardado final y redirección post-firma
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionComplete, setSubmissionComplete] = useState<boolean>(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(5);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [showPopupSuccess, setShowPopupSuccess] = useState<boolean>(false);
  const redirectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar temporizador de redirección si el componente se desmonta antes de tiempo
  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearInterval(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, []);

  // Refs for triggering validation and saving state in form steps
  const triggerValidationRef = useRef<(() => Promise<boolean>) | null>(null);
  const saveStateRef = useRef<(() => void) | null>(null);

  const totalPasos = 4;

  const handleSubmitFinal = async () => {
    setIsSubmitting(true);
    setProgressMessage('Enviando consentimiento de forma segura...');

    try {
      const stateToSend = currentWizardState;
      console.log('[DEBUG Frontend] stateToSend:', stateToSend);
      console.log('[DEBUG Frontend] artistaSeleccionado (state):', artistaSeleccionado);
      const idempotencyKey = getOrCreateIdempotencyKey();

      const result = await submitConsentToApi({ state: stateToSend, idempotencyKey });

      // Crear registro de firma en local logs como respaldo visible solo en admin
      const tempId = 'SUB_' + Math.random().toString(36).slice(2, 11).toUpperCase();
      const localSub: Submission = {
        id: tempId,
        tatuadorId: stateToSend.artistaSeleccionado?.id || 'unknown',
        tatuadorNombre: stateToSend.artistaSeleccionado?.nombreYApellidos || 'Tatuador VOD INK',
        clienteNombre: stateToSend.datosCliente.nombreYApellidos,
        clienteDni: stateToSend.datosCliente.dni,
        fecha: new Date().toLocaleDateString('es-ES') + ' ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        estado: result.status === 'signed' ? 'ok' : 'pendiente',
        driveFileId: result.driveFileId || undefined,
        driveViewLink: result.driveViewLink || undefined,
      };

      // Guardar firma localmente
      const existing = localStorage.getItem('vod_ink_submissions');
      const list: Submission[] = existing ? JSON.parse(existing) : [];
      list.unshift(localSub);
      localStorage.setItem('vod_ink_submissions', JSON.stringify(list));

      // Mostrar pantalla de éxito y programar redirección al inicio en 5s
      setSubmissionComplete(true);
      setRedirectCountdown(5);

      redirectTimerRef.current = setInterval(() => {
        setRedirectCountdown((prev) => {
          if (prev <= 1) {
            if (redirectTimerRef.current) {
              clearInterval(redirectTimerRef.current);
              redirectTimerRef.current = null;
            }
            // Limpiar caché de sesión y recargar para evitar firmas duplicadas
            clearIdempotencyKey();
            sessionStorage.clear();
            window.location.reload();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Fatal error submitting consent:', err);
      alert('Ocurrió un error crítico durante el envío del consentimiento. Por favor, reintente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('¿Desea borrar el progreso actual y volver a empezar? Esta acción limpiará todo el formulario.')) {
      clearIdempotencyKey();
      setPaso(-1);
      setDirection(-1);
      setPrivacyChecked(false);
      setArtistaSeleccionado(null);
      setDatosCliente(INITIAL_CLIENT);
      setEsMenor(false);
      setDatosRepresentante(INITIAL_REPRESENTATIVE);
      setDatosTecnica(INITIAL_TECHNIQUE);
      setDeclaracionLeido(false);
      setDeclaracionContraindicaciones(false);
      setDeclaracionSaludSeleccionadas([]);
      setConfirmadoPrecio(true);
      setFirmaCliente('');
      setFirmaAplicador('');
    }
  };

  const handleNext = async () => {
    // If there is an active validation trigger in the current step, run it first
    if (!bypassValidation && triggerValidationRef.current) {
      const isValid = await triggerValidationRef.current();
      if (!isValid) return;
    } else {
      // If we bypass validation or there is no validation function, we still save current state
      if (saveStateRef.current) {
        saveStateRef.current();
      }
    }

    if (paso === totalPasos) {
      handleConfirmSubmitFlow();
    } else {
      setDirection(1);
      setPaso((prev) => Math.min(prev + 1, totalPasos));
    }
  };

  const handleConfirmSubmitFlow = () => {
    setShowPopupSuccess(true);
  };

  const handlePrev = () => {
    if (saveStateRef.current) {
      saveStateRef.current();
    }
    setDirection(-1);
    setPaso((prev) => Math.max(prev - 1, 0));
  };

  const handleJumpToStep = (targetStep: number) => {
    if (targetStep === paso) return;
    if (saveStateRef.current) {
      saveStateRef.current();
    }
    setDirection(targetStep > paso ? 1 : -1);
    setPaso(targetStep);
  };

  // Determine if the client is allowed to advance in the current step
  const canAdvance = (): boolean => {
    if (bypassValidation) return true;
    switch (paso) {
      case 0:
        return !!artistaSeleccionado;
      case 1:
        // Handled by react-hook-form trigger, default true
        return true;
      case 2:
        return declaracionLeido;
      case 3:
        return declaracionContraindicaciones;
      case 4:
        return !!firmaCliente;
      // Nota: Se omiten las validaciones de presupuesto y de la firma del tatuador
      // ya que fueron excluidos del flujo del cliente.
      default:
        return true;
    }
  };

  // Slide transition animation config (smooth slide-in-up)
  const slideVariants = {
    enter: (dir: number) => ({
      y: dir > 0 ? 30 : -30,
      opacity: 0,
    }),
    center: {
      y: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      y: dir > 0 ? -30 : 30,
      opacity: 0,
    }),
  };

  const currentWizardState: WizardState = {
    pasoActual: paso,
    artistaSeleccionado,
    datosCliente,
    esMenor,
    datosRepresentante,
    datosTecnica,
    declaracionLeido,
    declaracionContraindicaciones,
    declaracionSaludSeleccionadas,
    confirmadoPrecio,
    firmaCliente,
    firmaAplicador,
    lugar: 'Santander',
    fecha: new Date().toLocaleDateString('es-ES'),
  };

  const getSubmissionsList = (): any[] => {
    const list = localStorage.getItem('vod_ink_submissions');
    return list ? JSON.parse(list) : [];
  };

  const clearSubmissionsList = () => {
    if (window.confirm('¿Seguro que desea limpiar la bitácora de firmas local?')) {
      localStorage.removeItem('vod_ink_submissions');
      // Trigger re-render
      setDirection(1);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col justify-between overflow-hidden bg-white text-black font-sans relative select-none pb-safe">
      
      {/* 1. Header & Navigation (Only displayed inside the wizard) */}
      {paso >= 0 && (
        <>
          <Header
            pasoActual={paso}
            totalPasos={totalPasos}
            artistaSeleccionado={artistaSeleccionado}
            onReset={handleReset}
          />
          
          {/* Direct Horizontal Steps Navigation Bar */}
          <div className="bg-zinc-50 border-b border-zinc-200/80 px-5 sm:px-8 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0 z-20">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth max-w-full">
              {Array.from({ length: 5 }).map((_, idx) => {
                const isCurrent = paso === idx;
                const stepNames = [
                  '0. Artista',
                  '1. Cliente',
                  '2. Riesgos',
                  '3. Salud',
                  '4. Firma Cliente'
                ];
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleJumpToStep(idx)}
                    className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-zinc-950 text-white shadow-sm ring-1 ring-zinc-950'
                        : 'bg-white text-zinc-500 hover:text-zinc-900 border border-zinc-200/80 hover:bg-zinc-50 hover:border-zinc-300'
                    }`}
                  >
                    {stepNames[idx]}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 border-t md:border-t-0 border-zinc-200/60 pt-2 md:pt-0">
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={bypassValidation}
                  onChange={(e) => setBypassValidation(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-8 h-4.5 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-zinc-950"></div>
                <span className="ml-2 text-[10px] font-black text-zinc-700 uppercase tracking-wide">
                  Modo Pruebas (Omitir Validación)
                </span>
              </label>
            </div>
          </div>

          {/* Validation Bypass Amber Alert Banner */}
          {bypassValidation && (
            <div className="bg-amber-50 border-b border-amber-100 text-amber-800 text-[10px] font-semibold px-5 sm:px-8 py-1.5 flex items-center gap-1.5 select-none animate-fadeIn shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span><strong>Modo Pruebas Activo:</strong> Se omiten las validaciones obligatorias para facilitar la revisión libre de todas las secciones.</span>
            </div>
          )}
        </>
      )}

      {/* 2. Main content area (Controlled viewport fitting) */}
      <main className="flex-1 relative overflow-hidden bg-white flex flex-col">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          {paso === -1 ? (
            // RGPD Entry Privacy Gate (Styled to match the gorgeous light bento look)
            <motion.div
              key="privacy-gate"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="absolute inset-0 flex flex-col justify-between p-4 sm:p-6 overflow-y-auto bg-zinc-50/50"
            >
              <div className="max-w-md mx-auto w-full space-y-4 sm:space-y-6 my-auto py-4 sm:py-8">
                <div className="text-center space-y-3 sm:space-y-4">
                  <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-zinc-950 text-white items-center justify-center mx-auto shadow-md">
                    <FileSignature className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="font-sans font-semibold text-xl sm:text-2xl tracking-tight text-zinc-950">
                      Consentimiento Informado
                    </h1>
                    <p className="font-sans text-xs text-zinc-500 font-medium">
                      Estudio de Arte Corporal Vod Ink · Santander
                    </p>
                  </div>
                </div>

                {/* Privacy agreement Box (Bento Card style) */}
                <div className="bento-card bg-white border border-zinc-200/80 p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-sm/5 rounded-2xl">
                  <div className="space-y-2">
                    <h2 className="font-sans font-semibold text-[15px] tracking-tight text-zinc-900">
                      Protección y tratamiento de sus datos
                    </h2>
                    <p className="font-sans text-xs leading-relaxed text-zinc-500 font-normal">
                      Para proceder con su tratamiento de forma segura y cumplir con la normativa sanitaria de Cantabria (Decreto 72/2006), es necesario recopilar y tratar ciertos datos identificativos y de salud de manera estrictamente confidencial.
                    </p>
                  </div>
                  
                  <div className="hidden sm:flex bg-amber-50/40 border border-amber-100/60 p-4 rounded-xl gap-3 items-start">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-left">
                      <h4 className="font-sans text-[11px] font-semibold text-amber-900 uppercase tracking-wider">Aviso de seguridad y salud</h4>
                      <p className="font-sans text-[12px] text-amber-800 leading-normal font-medium text-balance">
                        Al iniciar, habilitará el registro de su historial médico para evaluar posibles contraindicaciones. Toda la información recogida está sujeta a secreto profesional.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Consent checkbox (Beautiful Light Bento Checkbox Card) */}
                <div
                  role="checkbox"
                  aria-checked={privacyChecked}
                  tabIndex={0}
                  className={`bento-card p-4 sm:p-5 flex items-center gap-3 sm:gap-4 select-none cursor-pointer transition-all duration-300 rounded-2xl focus:outline-none focus:ring-1 focus:ring-zinc-950 ${
                    privacyChecked
                      ? 'bg-zinc-50 border-zinc-950 ring-1 ring-zinc-950 text-zinc-950 shadow-sm'
                      : 'bg-white border border-zinc-200 text-zinc-900 hover:border-zinc-300 hover:shadow-sm'
                  }`}
                  onClick={() => setPrivacyChecked(!privacyChecked)}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      setPrivacyChecked(!privacyChecked);
                    }
                  }}
                >
                  <div
                    className={`w-5.5 h-5.5 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-200 ${
                      privacyChecked ? 'border-zinc-950 bg-zinc-950 text-white' : 'border-zinc-300 bg-zinc-50 text-transparent'
                    }`}
                  >
                    {privacyChecked && <ShieldCheck className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <div className="flex-1">
                    <span
                      className={`font-sans font-medium text-xs leading-snug block text-balance ${
                        privacyChecked ? 'text-zinc-950 font-semibold' : 'text-zinc-700'
                      }`}
                    >
                      Acepto el tratamiento de datos de salud y la política de privacidad
                    </span>
                  </div>
                </div>

                {/* Buttons block */}
                <div className="space-y-3">
                  <button
                    type="button"
                    disabled={!privacyChecked}
                    onClick={() => {
                      clearIdempotencyKey();
                      setDirection(1);
                      setPaso(0);
                    }}
                    className={`w-full py-3.5 text-sm font-semibold tracking-wide transition-all min-h-[48px] cursor-pointer rounded-2xl text-center flex items-center justify-center gap-2 ${
                      privacyChecked
                        ? 'bg-zinc-950 text-white hover:bg-zinc-800 active:bg-zinc-900 border border-zinc-950 shadow-md hover:shadow-lg'
                        : 'bg-zinc-100 text-zinc-400 border border-zinc-100 cursor-not-allowed opacity-60'
                    }`}
                    id="btn-agree-privacy"
                  >
                    <span>Comenzar declaración de consentimiento</span>
                  </button>
                </div>

                {/* Local Submissions Logs Overlay/List */}
                {showLogs && (
                  <div className="bento-card border border-zinc-200 bg-white p-4 space-y-3 max-h-[220px] overflow-y-auto font-mono text-[10px] text-zinc-600 shadow-sm animate-fadeIn">
                    <div className="flex justify-between items-center border-b border-zinc-100 pb-2 mb-1.5">
                      <span className="font-bold uppercase text-zinc-800 text-[9px] tracking-wider">Firmas del estudio (Caché local)</span>
                      <button
                        type="button"
                        onClick={clearSubmissionsList}
                        className="text-red-600 underline font-semibold hover:text-red-800 uppercase text-[9px] tracking-wider cursor-pointer"
                      >
                        Limpiar todo
                      </button>
                    </div>
                    {getSubmissionsList().length === 0 ? (
                      <div className="text-center py-4 text-zinc-400 uppercase font-bold text-[9px] tracking-wider">Sin registros previos en esta tableta</div>
                    ) : (
                      <div className="space-y-3">
                        {getSubmissionsList().map((sub) => (
                          <div key={sub.id} className="border-b border-zinc-50 pb-2 flex justify-between items-start last:border-0 last:pb-0">
                            <div>
                              <div className="font-bold text-zinc-900 uppercase text-[10px]">{sub.clienteNombre}</div>
                              <div className="text-zinc-500 mt-0.5 text-[9px]">DNI: {sub.clienteDni} | Artista: {sub.tatuadorNombre.split(' ')[0]}</div>
                              <div className="text-zinc-400 text-[8px] mt-0.5">{sub.fecha}</div>
                            </div>
                            <span className={`px-2 py-0.5 text-[8px] font-bold uppercase border rounded-md ${
                              sub.estado === 'ok' ? 'bg-zinc-100 text-zinc-800 border-zinc-200' : 'bg-red-50 text-red-700 border-red-100'
                            }`}>
                              {sub.estado}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            // Steps view
            <motion.div
              key={`step-${paso}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="absolute inset-0 flex flex-col justify-between"
            >
              {paso === 0 && (
                <Step0Artist
                  artistaSeleccionado={artistaSeleccionado}
                  onSelect={setArtistaSeleccionado}
                />
              )}

              {paso === 1 && (
                <Step1Client
                  datosCliente={datosCliente}
                  datosRepresentante={datosRepresentante}
                  esMenor={esMenor}
                  onUpdate={(data) => {
                    setDatosCliente(data.datosCliente);
                    setDatosRepresentante(data.datosRepresentante);
                    setEsMenor(data.esMenor);
                  }}
                  triggerValidationRef={triggerValidationRef}
                  saveStateRef={saveStateRef}
                />
              )}

              {/* 
                NOTA: El Paso 2 original (Step2Technique - Datos Técnicos de Intervención)
                ha sido temporalmente excluido de la vista de asistente de usuario.
                Se conserva en la base de código para el Panel de Administración del Tatuador.
              */}

              {paso === 2 && (
                <Step3Legal
                  declaracionLeido={declaracionLeido}
                  onUpdate={setDeclaracionLeido}
                  triggerValidationRef={triggerValidationRef}
                />
              )}

              {paso === 3 && (
                <Step4Contraindications
                  declaracionContraindicaciones={declaracionContraindicaciones}
                  declaracionSaludSeleccionadas={declaracionSaludSeleccionadas}
                  onUpdate={(data) => {
                    setDeclaracionContraindicaciones(data.declaracionContraindicaciones);
                    setDeclaracionSaludSeleccionadas(data.declaracionSaludSeleccionadas);
                  }}
                  triggerValidationRef={triggerValidationRef}
                />
              )}

              {/* 
                NOTA: El Paso 4 original (Step5Price - Presupuesto e Información Financiera)
                ha sido temporalmente excluido de la vista de asistente de usuario.
                Se conserva en la base de código para el Panel de Administración del Tatuador.
              */}

              {paso === 4 && (
                <Step6SignatureClient
                  datosCliente={datosCliente}
                  datosRepresentante={datosRepresentante}
                  esMenor={esMenor}
                  firmaCliente={firmaCliente}
                  onUpdate={setFirmaCliente}
                  triggerValidationRef={triggerValidationRef}
                  onConfirmSubmit={handleConfirmSubmitFlow}
                />
              )}

              {/* 
                NOTA: El paso original de Firma de Tatuador (Step7SignatureArtist)
                ha sido temporalmente excluido de la vista de asistente de usuario.
                Se conserva en la base de código para el Panel de Administración del Tatuador.
              */}

              {paso === 5 && (
                <div className="text-center py-8">
                  {/* Se omitió Step8Confirmation y se maneja por modal/toast final */}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Footer (Only inside standard wizard steps 0 to 4) */}
      {paso >= 0 && paso < 5 && (
        <StepFooter
          pasoActual={paso}
          totalPasos={totalPasos}
          onNext={handleNext}
          onPrev={handlePrev}
          canNext={canAdvance()}
          nextLabel={paso === 4 ? 'Registrar y respaldar' : 'Siguiente'}
        />
      )}

      {/* Overlay de Carga durante el envío final */}
      {isSubmitting && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-lg animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin stroke-[2]" />
          </div>
          <div className="text-center space-y-1.5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold block">
              Procesando Registro
            </span>
            <h3 className="font-sans font-bold text-sm text-zinc-950 tracking-tight">
              {progressMessage}
            </h3>
          </div>
        </div>
      )}

      {/* Pop-up Modal de Confirmación de Firma */}
      {showPopupSuccess && (
        <div className="absolute inset-0 z-50 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center p-5 animate-fadeIn">
          <div className="max-w-sm w-full bg-white border border-zinc-100 p-6 rounded-2xl shadow-xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shadow-sm animate-bounce">
              <ShieldCheck className="w-6 h-6 stroke-[2]" />
            </div>
            <div className="space-y-2">
              <h3 className="font-sans font-extrabold text-sm text-zinc-950 tracking-tight uppercase tracking-wider">
                Confirmar Firma y Enviar
              </h3>
              <div className="flex items-center justify-center gap-2 text-emerald-800 font-sans text-xs font-semibold bg-emerald-50 p-3.5 border border-emerald-200 rounded-xl shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Firma del cliente registrada y autenticada correctamente</span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPopupSuccess(false)}
                className="flex-1 border border-zinc-200 bg-white text-zinc-700 py-3 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-50 active:bg-zinc-100 transition-all cursor-pointer min-h-[44px]"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowPopupSuccess(false);
                  await handleSubmitFinal();
                }}
                className="flex-1 bg-zinc-950 text-white py-3 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-800 active:bg-zinc-900 transition-all cursor-pointer min-h-[44px] shadow-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pantalla de éxito post-firma con redirección automática */}
      {submissionComplete && (
        <div className="absolute inset-0 z-[60] bg-white flex flex-col items-center justify-center p-6 animate-fadeIn">
          <div className="max-w-sm w-full bg-white border border-zinc-200 p-8 rounded-3xl shadow-xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shadow-sm">
              <ShieldCheck className="w-8 h-8 stroke-[2]" />
            </div>
            <div className="space-y-2">
              <h3 className="font-sans font-extrabold text-lg text-zinc-950 tracking-tight">
                Envío correcto
              </h3>
              <p className="font-sans text-sm text-zinc-500 leading-relaxed">
                El consentimiento ha sido registrado de forma segura.
              </p>
            </div>
            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                Redirigiendo al inicio
              </p>
              <p className="font-sans font-bold text-3xl text-zinc-950">
                {redirectCountdown}
              </p>
              <div className="h-1.5 w-full bg-zinc-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${(redirectCountdown / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
