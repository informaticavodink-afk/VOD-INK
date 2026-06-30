/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Establecimiento {
  nombreRazonSocial: string;
  domicilio: string;
  localidad: string;
  cp: string;
  cif: string;
  telefono: string;
  numRegistroSanidad: string;
  fechaAutorizacion: string;
}

export interface Aplicador {
  id: string;
  nombreYApellidos: string;
  titulacion: string;
  dni: string;
  fotoUrl?: string;
  carpetaDriveId: string;
}

export interface Cliente {
  nombreYApellidos: string;
  dni: string;
  fechaNacimiento: string;
  domicilio: string;
  cp: string;
  localidad: string;
  telefono: string;
}

export interface RepresentanteLegal {
  nombreYApellidos: string;
  dni: string;
  fechaNacimiento: string;
  domicilio: string;
  cp: string;
  localidad: string;
  telefono: string;
  parentesco: string;
  acreditaMediante: string;
}

export interface Tinta {
  nombre: string;
  numRegistroAEMPS: string;
  lote: string;
  caducidad: string;
}

export interface Tecnica {
  denominacionGenerica: string;
  localizacionAnatomica: string;
  tintas: Tinta[];
  otrosMateriales: string;
  duracion: string;
  posibilidadesEliminacion: string;
  presupuesto: string;
}

export interface Firmas {
  cliente: string; // dataURL PNG of the signature
  aplicador: string; // dataURL PNG of the signature
  lugar: string;
  fecha: string;
  declaracionLeido: boolean;
  declaracionContraindicaciones: boolean;
  esMenor: boolean;
}

export interface Submission {
  id: string;
  tatuadorId: string;
  tatuadorNombre: string;
  clienteNombre: string;
  clienteDni: string;
  fecha: string;
  driveFileId?: string;
  driveViewLink?: string;
  estado: 'ok' | 'pendiente' | 'error';
  pdfFallbackKey?: string; // index key for local storage fallback
}

export interface WizardState {
  pasoActual: number;
  artistaSeleccionado: Aplicador | null;
  datosCliente: Cliente;
  esMenor: boolean;
  datosRepresentante: RepresentanteLegal;
  datosTecnica: Tecnica;
  declaracionLeido: boolean;
  declaracionContraindicaciones: boolean;
  declaracionSaludSeleccionadas: string[]; // list of health conditions marked
  confirmadoPrecio: boolean;
  firmaCliente: string; // png base64
  firmaAplicador: string; // png base64
  lugar: string;
  fecha: string;
}
