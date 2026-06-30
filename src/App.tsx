/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Aplicador, Cliente, RepresentanteLegal, Tecnica, WizardState } from './types';
import Header from './components/Header';
import StepFooter from './components/StepFooter';

// Steps imports
import Step0Artist from './steps/Step0_Artist';
import Step1Client from './steps/Step1_Client';
import Step2Technique from './steps/Step2_Technique';
import Step3Legal from './steps/Step3_Legal';
import Step4Contraindications from './steps/Step4_Contraindications';
import Step5Price from './steps/Step5_Price';
import Step6SignatureClient from './steps/Step6_SignatureClient';
import Step7SignatureArtist from './steps/Step7_SignatureArtist';
import Step8Confirmation from './steps/Step8_Confirmation';

import { LEGAL_SECTIONS } from './lib/legalTexts';
import { ShieldCheck, ShieldAlert, FileSignature, Database, FileClock } from 'lucide-react';

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
  localizacionAnatomica: '',
  tintas: [],
  otrosMateriales: '',
  duracion: '',
  posibilidadesEliminacion: '',
  presupuesto: '',
};

export default function App() {
  // -1 is the Privacy Consent Gate, 0 to 8 are the standard Wizard Steps
  const [paso, setPaso] = useState<number>(-1);
  const [direction, setDirection] = useState<number>(1); // 1 = next, -1 = prev
  const [privacyChecked, setPrivacyChecked] = useState<boolean>(false);
  const [privacyExpanded, setPrivacyExpanded] = useState<boolean>(false);
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
  const [confirmadoPrecio, setConfirmadoPrecio] = useState<boolean>(false);
  const [firmaCliente, setFirmaCliente] = useState<string>('');
  const [firmaAplicador, setFirmaAplicador] = useState<string>('');

  // Refs for triggering validation and saving state in form steps
  const triggerValidationRef = useRef<(() => Promise<boolean>) | null>(null);
  const saveStateRef = useRef<(() => void) | null>(null);

  const totalPasos = 8;

  const handleReset = () => {
    if (window.confirm('¿Desea borrar el progreso actual y volver a empezar? Esta acción limpiará todo el formulario.')) {
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
      setConfirmadoPrecio(false);
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

    setDirection(1);
    setPaso((prev) => Math.min(prev + 1, totalPasos));
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
        // Handled by react-hook-form trigger, default true
        return true;
      case 3:
        return declaracionLeido;
      case 4:
        return declaracionContraindicaciones;
      case 5:
        return confirmadoPrecio;
      case 6:
        return !!firmaCliente;
      case 7:
        return !!firmaAplicador;
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
              {Array.from({ length: 9 }).map((_, idx) => {
                const isCurrent = paso === idx;
                const stepNames = [
                  '0. Artista',
                  '1. Cliente',
                  '2. Intervención',
                  '3. Riesgos',
                  '4. Salud',
                  '5. Presupuesto',
                  '6. Firma Cliente',
                  '7. Firma Tatuador',
                  '8. Respaldo'
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
              className="absolute inset-0 flex flex-col justify-between p-6 overflow-y-auto bg-zinc-50/50"
            >
              <div className="max-w-md mx-auto w-full space-y-6 my-auto py-8">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-zinc-950 text-white flex items-center justify-center mx-auto shadow-md">
                    <FileSignature className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h1 className="font-sans font-semibold text-2xl tracking-tight text-zinc-950">
                      Consentimiento Informado
                    </h1>
                    <p className="font-sans text-xs text-zinc-500 font-medium">
                      Estudio de Arte Corporal Vod Ink · Santander
                    </p>
                  </div>
                </div>

                {/* Privacy agreement Box (Bento Card style) */}
                <div className="bento-card bg-white border border-zinc-200/80 p-6 space-y-5 shadow-sm/5 rounded-2xl">
                  <div className="space-y-2">
                    <h2 className="font-sans font-semibold text-[15px] tracking-tight text-zinc-900">
                      Protección y tratamiento de sus datos
                    </h2>
                    <p className="font-sans text-xs leading-relaxed text-zinc-500 font-normal">
                      Para proceder con su tratamiento de forma segura y cumplir con la normativa sanitaria de Cantabria (Decreto 72/2006), es necesario recopilar y tratar ciertos datos identificativos y de salud de manera estrictamente confidencial.
                    </p>
                  </div>
                  
                  {privacyExpanded ? (
                    <div className="space-y-3 animate-fadeIn">
                      <div className="max-h-48 overflow-y-auto pr-1 border border-zinc-100 p-3.5 rounded-xl bg-zinc-50/50">
                        <p className="font-sans text-[12px] leading-relaxed text-zinc-600 font-medium text-justify">
                          {LEGAL_SECTIONS.privacidad.texto}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPrivacyExpanded(false)}
                        className="text-zinc-500 hover:text-zinc-950 text-xs font-semibold underline transition-all flex items-center gap-1 cursor-pointer"
                      >
                        Ocultar texto legal completo
                      </button>
                    </div>
                  ) : (
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setPrivacyExpanded(true)}
                        className="text-zinc-950 hover:text-zinc-800 text-xs font-semibold underline decoration-zinc-900 underline-offset-4 transition-all flex items-center gap-1 cursor-pointer"
                      >
                        Leer política de privacidad completa
                      </button>
                    </div>
                  )}
                  
                  <div className="bg-amber-50/40 border border-amber-100/60 p-4 rounded-xl flex gap-3 items-start">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
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
                  className={`bento-card p-5 flex items-center gap-4 select-none cursor-pointer transition-all duration-300 rounded-2xl focus:outline-none focus:ring-1 focus:ring-zinc-950 ${
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

              {paso === 2 && (
                <Step2Technique
                  datosTecnica={datosTecnica}
                  onUpdate={setDatosTecnica}
                  triggerValidationRef={triggerValidationRef}
                  saveStateRef={saveStateRef}
                />
              )}

              {paso === 3 && (
                <Step3Legal
                  declaracionLeido={declaracionLeido}
                  onUpdate={setDeclaracionLeido}
                  triggerValidationRef={triggerValidationRef}
                />
              )}

              {paso === 4 && (
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

              {paso === 5 && (
                <Step5Price
                  datosTecnica={datosTecnica}
                  confirmadoPrecio={confirmadoPrecio}
                  onUpdate={setConfirmadoPrecio}
                  triggerValidationRef={triggerValidationRef}
                />
              )}

              {paso === 6 && (
                <Step6SignatureClient
                  datosCliente={datosCliente}
                  datosRepresentante={datosRepresentante}
                  esMenor={esMenor}
                  firmaCliente={firmaCliente}
                  onUpdate={setFirmaCliente}
                  triggerValidationRef={triggerValidationRef}
                />
              )}

              {paso === 7 && (
                <Step7SignatureArtist
                  artistaSeleccionado={artistaSeleccionado}
                  firmaAplicador={firmaAplicador}
                  onUpdate={setFirmaAplicador}
                  triggerValidationRef={triggerValidationRef}
                />
              )}

              {paso === 8 && (
                <Step8Confirmation
                  state={currentWizardState}
                  onReset={() => {
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
                    setConfirmadoPrecio(false);
                    setFirmaCliente('');
                    setFirmaAplicador('');
                  }}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Footer (Only inside standard wizard steps 0 to 7) */}
      {paso >= 0 && paso < 8 && (
        <StepFooter
          pasoActual={paso}
          totalPasos={totalPasos}
          onNext={handleNext}
          onPrev={handlePrev}
          canNext={canAdvance()}
          nextLabel={paso === 7 ? 'Registrar y respaldar' : 'Siguiente'}
        />
      )}
    </div>
  );
}
