/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';
import { ConsentTechniqueSchema } from '../domain/consents/consentPdfSchema.js';

// Utility to validate Spanish DNI/NIE
export function validateDNI(dni: string): boolean {
  const cleanDni = dni.toUpperCase().replace(/[\s-]/g, '');
  if (!cleanDni) return false;

  const dniRegex = /^[0-9]{8}[A-Z]$/;
  const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/;

  if (!dniRegex.test(cleanDni) && !nieRegex.test(cleanDni)) {
    return false;
  }

  // Calculate matching letter
  let numberString = cleanDni;
  if (nieRegex.test(cleanDni)) {
    // Replace X, Y, Z with 0, 1, 2
    const firstChar = cleanDni.charAt(0);
    const replacement = firstChar === 'X' ? '0' : firstChar === 'Y' ? '1' : '2';
    numberString = replacement + cleanDni.slice(1);
  }

  const number = parseInt(numberString.slice(0, 8), 10);
  const letters = 'TRWAGMYFPDXBNJZSQVHLCKE';
  const expectedLetter = letters.charAt(number % 23);
  const actualLetter = cleanDni.slice(-1);

  return expectedLetter === actualLetter;
}

// Utility to validate Spanish phone numbers (allows spaces, dashes, dots, and standard +34 country code prefixes)
export function validateTelefono(val: string | undefined): boolean {
  if (!val) return false;
  const clean = val.replace(/[\s\-\(\)\+\.]/g, '');
  let withoutPrefix = clean;
  if (clean.startsWith('0034')) {
    withoutPrefix = clean.slice(4);
  } else if (clean.startsWith('34') && clean.length > 9) {
    withoutPrefix = clean.slice(2);
  }
  return /^[6789]\d{8}$/.test(withoutPrefix);
}

// Utility to calculate age from birthdate string (YYYY-MM-DD)
export function getAge(birthDateString: string): number {
  if (!birthDateString) return 0;
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export const ClientSchema = z.object({
  nombreYApellidos: z.string().min(3, 'Introduce nombre y dos apellidos'),
  dni: z.string().refine(validateDNI, 'DNI o NIE no válido'),
  fechaNacimiento: z.string().refine((val) => {
    if (!val) return false;
    const date = new Date(val);
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 100);
    return date < new Date() && date > minDate;
  }, 'Fecha de nacimiento no válida'),
  domicilio: z.string().min(4, 'Introduce el domicilio completo'),
  cp: z.string().regex(/^\d{5}$/, 'Código postal de 5 dígitos'),
  localidad: z.string().min(2, 'Introduce la localidad'),
  telefono: z.string().refine(validateTelefono, 'Teléfono de 9 dígitos no válido (6xx/7xx/8xx/9xx)'),
});

export const RepresentanteSchema = z.object({
  nombreYApellidos: z.string().min(3, 'Introduce nombre completo del representante'),
  dni: z.string().refine(validateDNI, 'DNI o NIE del representante no válido'),
  fechaNacimiento: z.string().refine((val) => {
    if (!val) return false;
    const age = getAge(val);
    return age >= 18;
  }, 'El representante legal debe ser mayor de edad'),
  domicilio: z.string().min(4, 'Introduce el domicilio completo del representante'),
  cp: z.string().regex(/^\d{5}$/, 'Código postal de 5 dígitos'),
  localidad: z.string().min(2, 'Introduce la localidad'),
  telefono: z.string().refine(validateTelefono, 'Teléfono de 9 dígitos no válido'),
  parentesco: z.string().min(1, 'Selecciona parentesco/tutoría'),
  acreditaMediante: z.string().min(1, 'Especifica cómo se acredita la representación'),
});

export const TechniqueSchema = ConsentTechniqueSchema;
