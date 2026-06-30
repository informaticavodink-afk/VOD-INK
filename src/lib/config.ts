/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Establecimiento, Aplicador } from '../types';

export const ESTABLECIMIENTO_VOD_INK: Establecimiento = {
  nombreRazonSocial: 'VOD INK STUDIO S.L.',
  domicilio: 'Calle Vargas 45, Bajo',
  localidad: 'Santander',
  cp: '39010',
  cif: 'B39123456',
  telefono: '942 05 44 22',
  numRegistroSanidad: 'SAN/07/2024-C',
  fechaAutorizacion: '15/06/2024',
};

export const ARTISTAS_VOD_INK: Aplicador[] = [
  {
    id: 'sara_urresti',
    nombreYApellidos: 'Sara Urresti Higuera',
    titulacion: 'Técnico Aplicador Homologado (Decreto 72/2006)',
    dni: '12345678X',
    carpetaDriveId: '1_D7A9C9_SaraVodInk',
  },
  {
    id: 'alberto_ruiz',
    nombreYApellidos: 'Alberto Ruiz Santos',
    titulacion: 'Técnico Higienista y Aplicador (Decreto 72/2006)',
    dni: '87654321Y',
    carpetaDriveId: '1_F8B0D0_AlbertoVodInk',
  },
  {
    id: 'lucia_gomez',
    nombreYApellidos: 'Lucía Fernández Gómez',
    titulacion: 'Especialista en Micropigmentación y Tatuaje',
    dni: '45678912Z',
    carpetaDriveId: '1_C5E2A1_LuciaVodInk',
  }
];

// Default ink list to select or autofill
export const TINTAS_PREDEFINIDAS = [
  { nombre: 'Intenze Zuper Black', numRegistroAEMPS: '344-PE', lote: 'ZB-2025-09', caducidad: '12/2028' },
  { nombre: 'Dynamic Triple Black', numRegistroAEMPS: '488-PE', lote: 'DTB-9912', caducidad: '05/2029' },
  { nombre: 'Eternal Ink Lining Black', numRegistroAEMPS: '129-PE', lote: 'EIL-0083', caducidad: '10/2027' },
  { nombre: 'World Famous Pitch Black', numRegistroAEMPS: '601-PE', lote: 'WFP-231', caducidad: '02/2029' },
];
