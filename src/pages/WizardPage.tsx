/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import type { Aplicador, Cliente, RepresentanteLegal, Submission, Tecnica, WizardState } from '../types';
import BrandMark from '../components/BrandMark';
import Header from '../components/Header';
import StepFooter from '../components/StepFooter';
import Step0Artist from '../steps/Step0_Artist';
import Step1Client from '../steps/Step1_Client';
import Step3Legal from '../steps/Step3_Legal';
import Step4Contraindications from '../steps/Step4_Contraindications';
import Step6SignatureClient from '../steps/Step6_SignatureClient';
import { clearIdempotencyKey, getOrCreateIdempotencyKey, submitConsentToApi } from '../lib/submissions';

// Los pasos técnicos, de presupuesto y de firma del artista se conservan fuera
// del flujo público porque se utilizarán desde el panel de administración.

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
  denominacionGenerica: '',
  localizacionAnatomica: '',
  tintas: [],
  otrosMateriales: '',
  duracion: '',
  posibilidadesEliminacion: '',
  presupuesto: '',
};

const TOTAL_STEPS = 4;

export default function WizardPage() {
  const [paso, setPaso] = useState<number>(-1);
  const [direction, setDirection] = useState<number>(1);
  const [privacyChecked, setPrivacyChecked] = useState<boolean>(false);

  const [artistaSeleccionado, setArtistaSeleccionado] = useState<Aplicador | null>(null);
  const [datosCliente, setDatosCliente] = useState<Cliente>(INITIAL_CLIENT);
  const [esMenor, setEsMenor] = useState<boolean>(false);
  const [tieneRepresentanteLegal, setTieneRepresentanteLegal] = useState<boolean>(false);
  const [datosRepresentante, setDatosRepresentante] = useState<RepresentanteLegal>(INITIAL_REPRESENTATIVE);
  const [datosTecnica, setDatosTecnica] = useState<Tecnica>(INITIAL_TECHNIQUE);
  const [declaracionLeido, setDeclaracionLeido] = useState<boolean>(false);
  const [declaracionContraindicaciones, setDeclaracionContraindicaciones] = useState<boolean>(false);
  const [declaracionSaludSeleccionadas, setDeclaracionSaludSeleccionadas] = useState<string[]>([]);
  const [confirmadoPrecio, setConfirmadoPrecio] = useState<boolean>(true);
  const [firmaCliente, setFirmaCliente] = useState<string>('');
  const [firmaAplicador, setFirmaAplicador] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionComplete, setSubmissionComplete] = useState<boolean>(false);
  const [redirectCountdown, setRedirectCountdown] = useState<number>(5);
  const [progressMessage, setProgressMessage] = useState<string>('');
  const [showPopupSuccess, setShowPopupSuccess] = useState<boolean>(false);

  const triggerValidationRef = useRef<(() => Promise<boolean>) | null>(null);
  const saveStateRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!submissionComplete) return undefined;

    const timer = window.setInterval(() => {
      setRedirectCountdown((previous) => Math.max(previous - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [submissionComplete]);

  useEffect(() => {
    if (!submissionComplete || redirectCountdown !== 0) return;

    clearIdempotencyKey();
    sessionStorage.clear();
    window.location.reload();
  }, [redirectCountdown, submissionComplete]);

  const currentWizardState: WizardState = {
    pasoActual: paso,
    artistaSeleccionado,
    datosCliente,
    esMenor,
    tieneRepresentanteLegal,
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

  const handleSubmitFinal = async () => {
    setIsSubmitting(true);
    setProgressMessage('Enviando consentimiento de forma segura...');

    try {
      const stateToSend = currentWizardState;
      const idempotencyKey = getOrCreateIdempotencyKey();
      const result = await submitConsentToApi({ state: stateToSend, idempotencyKey });

      const tempId = 'SUB_' + Math.random().toString(36).slice(2, 11).toUpperCase();
      const localSub: Submission = {
        id: tempId,
        tatuadorId: stateToSend.artistaSeleccionado?.id || 'unknown',
        tatuadorNombre: stateToSend.artistaSeleccionado?.nombreYApellidos || 'Tatuador VOD INK',
        clienteNombre: stateToSend.datosCliente.nombreYApellidos,
        clienteDni: stateToSend.datosCliente.dni,
        fecha:
          new Date().toLocaleDateString('es-ES') +
          ' ' +
          new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        estado: result.status === 'signed' ? 'ok' : 'pendiente',
        driveFileId: result.driveFileId || undefined,
        driveViewLink: result.driveViewLink || undefined,
      };

      const existing = localStorage.getItem('vod_ink_submissions:v1');
      const list: Submission[] = existing ? JSON.parse(existing) : [];
      list.unshift(localSub);
      localStorage.setItem('vod_ink_submissions:v1', JSON.stringify(list));

      setSubmissionComplete(true);
      setRedirectCountdown(5);


    } catch (error) {
      console.error('Fatal error submitting consent:', error);
      alert('Ocurrió un error crítico durante el envío del consentimiento. Por favor, reintente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    const shouldReset = window.confirm(
      '¿Desea borrar el progreso actual y volver a empezar? Esta acción limpiará todo el formulario.',
    );

    if (!shouldReset) return;

    clearIdempotencyKey();
    setPaso(-1);
    setDirection(-1);
    setPrivacyChecked(false);
    setArtistaSeleccionado(null);
    setDatosCliente(INITIAL_CLIENT);
    setEsMenor(false);
    setTieneRepresentanteLegal(false);
    setDatosRepresentante(INITIAL_REPRESENTATIVE);
    setDatosTecnica(INITIAL_TECHNIQUE);
    setDeclaracionLeido(false);
    setDeclaracionContraindicaciones(false);
    setDeclaracionSaludSeleccionadas([]);
    setConfirmadoPrecio(true);
    setFirmaCliente('');
    setFirmaAplicador('');
  };

  const handleNext = async () => {
    if (triggerValidationRef.current) {
      const isValid = await triggerValidationRef.current();
      if (!isValid) return;
    } else if (saveStateRef.current) {
      saveStateRef.current();
    }

    if (paso === TOTAL_STEPS) {
      setShowPopupSuccess(true);
      return;
    }

    setDirection(1);
    setPaso((previous) => Math.min(previous + 1, TOTAL_STEPS));
  };

  const handlePrev = () => {
    if (saveStateRef.current) {
      saveStateRef.current();
    }

    setDirection(-1);
    setPaso((previous) => Math.max(previous - 1, 0));
  };

  const canAdvance = (): boolean => {
    switch (paso) {
      case 0:
        return Boolean(artistaSeleccionado);
      case 1:
        return true;
      case 2:
        return declaracionLeido;
      case 3:
        return declaracionContraindicaciones;
      case 4:
        return Boolean(firmaCliente);
      default:
        return true;
    }
  };

  const slideVariants = {
    enter: (currentDirection: number) => ({
      y: currentDirection > 0 ? 30 : -30,
      opacity: 0,
    }),
    center: {
      y: 0,
      opacity: 1,
    },
    exit: (currentDirection: number) => ({
      y: currentDirection > 0 ? -30 : 30,
      opacity: 0,
    }),
  };

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-white text-black font-sans relative select-none">
      {paso >= 0 && (
        <Header
          pasoActual={paso}
          totalPasos={TOTAL_STEPS}
          artistaSeleccionado={artistaSeleccionado}
          onReset={handleReset}
        />
      )}

      <main className="flex-1 min-h-0 relative overflow-hidden bg-white flex flex-col">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          {paso === -1 ? (
            <motion.div
              key="privacy-gate"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="absolute inset-0 flex flex-col p-4 sm:p-6 overflow-y-auto overscroll-contain bg-zinc-50/50"
            >
              <div className="max-w-md mx-auto w-full space-y-4 sm:space-y-6 my-auto py-4 sm:py-8">
                <div className="text-center space-y-4 sm:space-y-5">
                  <BrandMark variant="hero" />

                  <div className="space-y-1.5">
                    <h1 className="font-sans font-semibold text-xl sm:text-2xl tracking-tight text-zinc-950">
                      Consentimiento Informado
                    </h1>
                    <p className="font-sans text-xs text-zinc-500 font-medium">
                      Estudio de Arte Corporal · Santander
                    </p>
                  </div>
                </div>

                <div className="bento-card bg-white border border-zinc-200/80 p-4 sm:p-6 space-y-4 sm:space-y-5 rounded-2xl">
                  <div className="space-y-2">
                    <h2 className="font-sans font-semibold text-[15px] tracking-tight text-zinc-900">
                      Protección y tratamiento de sus datos
                    </h2>
                    <p className="font-sans text-xs leading-relaxed text-zinc-500 font-normal">
                      Para proceder con su tratamiento de forma segura y cumplir con la normativa sanitaria de Cantabria
                      (Decreto 72/2006), es necesario recopilar y tratar ciertos datos identificativos y de salud de manera
                      estrictamente confidencial.
                    </p>
                  </div>

                  <div className="hidden sm:flex bg-amber-50/40 border border-amber-100/60 p-4 rounded-xl gap-3 items-start">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-left">
                      <h3 className="font-sans text-[11px] font-semibold text-amber-900 uppercase tracking-wider">
                        Aviso de seguridad y salud
                      </h3>
                      <p className="font-sans text-[12px] text-amber-800 leading-normal font-medium text-balance">
                        Al iniciar, habilitará el registro de su historial médico para evaluar posibles contraindicaciones.
                        Toda la información recogida está sujeta a secreto profesional.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  role="checkbox"
                  aria-checked={privacyChecked}
                  tabIndex={0}
                  className={`bento-card p-4 sm:p-5 flex items-center gap-3 sm:gap-4 select-none cursor-pointer transition-all duration-300 rounded-2xl focus:outline-none focus:ring-1 focus:ring-zinc-950 ${
                    privacyChecked
                      ? 'bg-zinc-50 border-zinc-950 ring-1 ring-zinc-950 text-zinc-950 shadow-sm'
                      : 'bg-white border border-zinc-200 text-zinc-900 hover:border-zinc-300 hover:shadow-sm'
                  }`}
                  onClick={() => setPrivacyChecked((checked) => !checked)}
                  onKeyDown={(event) => {
                    if (event.key === ' ' || event.key === 'Enter') {
                      event.preventDefault();
                      setPrivacyChecked((checked) => !checked);
                    }
                  }}
                >
                  <div
                    className={`w-5.5 h-5.5 rounded-lg border flex items-center justify-center shrink-0 transition-all duration-200 ${
                      privacyChecked
                        ? 'border-zinc-950 bg-zinc-950 text-white'
                        : 'border-zinc-300 bg-zinc-50 text-transparent'
                    }`}
                  >
                    {privacyChecked && <ShieldCheck className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>

                  <span
                    className={`font-sans font-medium text-xs leading-snug block text-balance ${
                      privacyChecked ? 'text-zinc-950 font-semibold' : 'text-zinc-700'
                    }`}
                  >
                    Acepto el tratamiento de datos de salud y la política de privacidad
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!privacyChecked}
                  onClick={() => {
                    clearIdempotencyKey();
                    setDirection(1);
                    setPaso(0);
                  }}
                  className={`w-full py-3.5 text-sm font-semibold tracking-wide transition-all min-h-[48px] rounded-2xl text-center flex items-center justify-center gap-2 ${
                    privacyChecked
                      ? 'bg-zinc-950 text-white hover:bg-zinc-800 active:bg-zinc-900 border border-zinc-950 shadow-md hover:shadow-lg'
                      : 'bg-zinc-100 text-zinc-400 border border-zinc-100 cursor-not-allowed opacity-60'
                  }`}
                  id="btn-agree-privacy"
                >
                  Comenzar declaración de consentimiento
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={`step-${paso}`}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="absolute inset-0 min-h-0 flex flex-col"
            >
              {paso === 0 && (
                <Step0Artist artistaSeleccionado={artistaSeleccionado} onSelect={setArtistaSeleccionado} />
              )}

              {paso === 1 && (
                <Step1Client
                  datosCliente={datosCliente}
                  datosRepresentante={datosRepresentante}
                  esMenor={esMenor}
                  tieneRepresentanteLegal={tieneRepresentanteLegal}
                  onUpdate={(data) => {
                    setDatosCliente(data.datosCliente);
                    setDatosRepresentante(data.datosRepresentante);
                    setEsMenor(data.esMenor);
                    setTieneRepresentanteLegal(data.tieneRepresentanteLegal);
                  }}
                  triggerValidationRef={triggerValidationRef}
                  saveStateRef={saveStateRef}
                />
              )}

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

              {paso === 4 && (
                <Step6SignatureClient
                  datosCliente={datosCliente}
                  datosRepresentante={datosRepresentante}
                  tieneRepresentanteLegal={tieneRepresentanteLegal}
                  firmaCliente={firmaCliente}
                  onUpdate={setFirmaCliente}
                  triggerValidationRef={triggerValidationRef}
                  onConfirmSubmit={() => setShowPopupSuccess(true)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {paso >= 0 && paso <= TOTAL_STEPS && (
        <StepFooter
          pasoActual={paso}
          totalPasos={TOTAL_STEPS}
          onNext={handleNext}
          onPrev={handlePrev}
          canNext={canAdvance()}
          nextLabel={paso === TOTAL_STEPS ? 'Registrar y respaldar' : 'Siguiente'}
          isSubmitting={isSubmitting}
        />
      )}

      {isSubmitting && (
        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4 animate-fadeIn">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center shadow-lg animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin stroke-[2]" />
          </div>
          <div className="text-center space-y-1.5">
            <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-400 font-bold block">
              Procesando Registro
            </span>
            <h2 className="font-sans font-bold text-sm text-zinc-950 tracking-tight">{progressMessage}</h2>
          </div>
        </div>
      )}

      {showPopupSuccess && (
        <div className="absolute inset-0 z-50 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center p-5 animate-fadeIn">
          <div className="max-w-sm w-full bg-white border border-zinc-100 p-6 rounded-2xl shadow-xl space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shadow-sm animate-bounce">
              <ShieldCheck className="w-6 h-6 stroke-[2]" />
            </div>

            <div className="space-y-2">
              <h2 className="font-sans font-extrabold text-sm text-zinc-950 uppercase tracking-wider">
                Confirmar Firma y Enviar
              </h2>
              <div className="flex items-center justify-center gap-2 text-emerald-800 font-sans text-xs font-semibold bg-emerald-50 p-3.5 border border-emerald-200 rounded-xl shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Firma del cliente registrada y autenticada correctamente</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPopupSuccess(false)}
                className="flex-1 border border-zinc-200 bg-white text-zinc-700 py-3 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-50 active:bg-zinc-100 transition-all min-h-[44px]"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowPopupSuccess(false);
                  await handleSubmitFinal();
                }}
                className="flex-1 bg-zinc-950 text-white py-3 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-zinc-800 active:bg-zinc-900 transition-all min-h-[44px] shadow-sm"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {submissionComplete && (
        <div className="absolute inset-0 z-[60] bg-white flex flex-col items-center justify-center p-6 animate-fadeIn">
          <div className="max-w-sm w-full bg-white border border-zinc-200 p-8 rounded-3xl shadow-xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center mx-auto shadow-sm">
              <ShieldCheck className="w-8 h-8 stroke-[2]" />
            </div>

            <div className="space-y-2">
              <h2 className="font-sans font-extrabold text-lg text-zinc-950 tracking-tight">Envío correcto</h2>
              <p className="font-sans text-sm text-zinc-500 leading-relaxed">
                El consentimiento ha sido registrado de forma segura.
              </p>
            </div>

            <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                Redirigiendo al inicio
              </p>
              <p className="font-sans font-bold text-3xl text-zinc-950">{redirectCountdown}</p>
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
