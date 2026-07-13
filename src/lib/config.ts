/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Establecimiento, Aplicador } from '../types';

export const ESTABLECIMIENTO_VOD_INK: Establecimiento = {
  nombreRazonSocial: 'aquí iría tus datos de establecimiento...',
  domicilio: '[Dirección del Establecimiento]',
  localidad: '[Ciudad]',
  cp: '[C.P.]',
  cif: '[CIF]',
  telefono: '[Teléfono]',
  numRegistroSanidad: '[Nº Reg. Sanitario]',
  fechaAutorizacion: '[Fecha Autorización]',
};

export const ARTISTAS_VOD_INK: Aplicador[] = [
  {
    id: 'artista_1',
    nombreYApellidos: 'Tatuador Ejemplo 1',
    titulacion: 'Técnico Aplicador Homologado',
    dni: '00000000T',
    carpetaDriveId: 'folder_id_1',
  },
  {
    id: 'artista_2',
    nombreYApellidos: 'Tatuador Ejemplo 2',
    titulacion: 'Técnico Higienista y Aplicador',
    dni: '00000000T',
    carpetaDriveId: 'folder_id_2',
  },
  {
    id: 'artista_3',
    nombreYApellidos: 'Tatuador Ejemplo 3',
    titulacion: 'Especialista en Micropigmentación y Tatuaje',
    dni: '00000000T',
    carpetaDriveId: 'folder_id_3',
  }
];

// Default ink list to select or autofill
export const TINTAS_PREDEFINIDAS = [
  { nombre: 'Intenze Zuper Black', numRegistroAEMPS: '344-PE', lote: 'ZB-2025-09', caducidad: '12/2028' },
  { nombre: 'Dynamic Triple Black', numRegistroAEMPS: '488-PE', lote: 'DTB-9912', caducidad: '05/2029' },
  { nombre: 'Eternal Ink Lining Black', numRegistroAEMPS: '129-PE', lote: 'EIL-0083', caducidad: '10/2027' },
  { nombre: 'World Famous Pitch Black', numRegistroAEMPS: '601-PE', lote: 'WFP-231', caducidad: '02/2029' },
];
