import { z } from 'zod';

export const CONSENT_PDF_TEMPLATE_VERSION = 'consent-v4-registration-only';
export const CONSENT_PDF_V2_TEMPLATE_VERSION = 'consent-v2';
export const CONSENT_PDF_V3_TEMPLATE_VERSION = 'consent-v3-representation';

const requiredText = (label: string) => z.string().trim().min(1, `${label} es obligatorio`);
const forbiddenPlaceholder = /aquí iría|\[[^\]]+\]|no asignado|^n\/?a$|tatuador ejemplo|^0{8}[a-z]$/i;

const safeText = (label: string) => requiredText(label).refine(
  (value) => !forbiddenPlaceholder.test(value),
  `${label} contiene un valor provisional`,
);

export const InkSchema = z.object({
  nombre: safeText('Nombre de la tinta'),
  numRegistroAEMPS: safeText('Registro AEMPS'),
  lote: safeText('Lote'),
  caducidad: safeText('Caducidad'),
}).strict();

export const ConsentTechniqueSchema = z.object({
  denominacionGenerica: safeText('Técnica'),
  localizacionAnatomica: safeText('Localización anatómica'),
  tintas: z.array(InkSchema).min(1, 'Debe registrarse al menos una tinta'),
  otrosMateriales: safeText('Materiales'),
  duracion: safeText('Duración'),
  posibilidadesEliminacion: safeText('Posibilidades de eliminación'),
  presupuesto: safeText('Presupuesto'),
}).strict();

const personSchema = z.object({
  nombreYApellidos: safeText('Nombre y apellidos'),
  dni: safeText('Documento de identidad'),
  fechaNacimiento: safeText('Fecha de nacimiento'),
  domicilio: safeText('Domicilio'),
  cp: safeText('Código postal'),
  localidad: safeText('Localidad'),
  telefono: safeText('Teléfono'),
}).strict();

const representativeSchema = personSchema.extend({
  parentesco: safeText('Parentesco'),
  acreditaMediante: safeText('Acreditación'),
});

const pngSignatureSchema = z.string().regex(
  /^data:image\/png;base64,iVBORw0KGgo/,
  'La firma debe ser una imagen PNG válida',
);

const establishmentShape = {
  nombreRazonSocial: safeText('Razón social'),
  nombreComercial: safeText('Nombre comercial'),
  domicilio: safeText('Dirección del establecimiento'),
  localidad: safeText('Localidad del establecimiento'),
  cp: safeText('Código postal del establecimiento'),
  cif: safeText('CIF del establecimiento'),
  telefono: safeText('Teléfono del establecimiento'),
  numRegistroSanidad: safeText('Registro sanitario'),
};

const historicalEstablishmentSchema = z.object({
  ...establishmentShape,
  fechaAutorizacion: safeText('Fecha de autorización sanitaria'),
}).strict();

const registrationOnlyEstablishmentSchema = z.object({
  ...establishmentShape,
  fechaAutorizacion: z.never().optional(),
}).strict();

const consentShape = {
  generatedAt: safeText('Fecha de generación'),
  aplicador: z.object({
    id: z.string().uuid(),
    nombreYApellidos: safeText('Nombre del tatuador'),
    titulacion: safeText('Titulación del tatuador'),
    dni: safeText('DNI del tatuador'),
  }).strict(),
  cliente: personSchema,
  esMenor: z.boolean(),
  tieneRepresentanteLegal: z.boolean().optional(),
  representante: representativeSchema.nullable(),
  tecnica: ConsentTechniqueSchema,
  salud: z.array(z.string().trim().min(1)),
  declaracionLeido: z.literal(true),
  confirmadoPrecio: z.boolean(),
  firmaCliente: pngSignatureSchema,
  firmaAplicador: pngSignatureSchema,
  lugar: safeText('Lugar de firma'),
  fecha: safeText('Fecha de firma'),
};

function validateRepresentation(
  data: { esMenor: boolean; tieneRepresentanteLegal?: boolean; representante?: unknown },
  context: z.RefinementCtx,
  explicit: boolean,
) {
  if (explicit) {
    if (typeof data.tieneRepresentanteLegal !== 'boolean') {
      context.addIssue({ code: 'custom', path: ['tieneRepresentanteLegal'], message: 'La representación legal debe estar indicada' });
    } else if (data.esMenor && !data.tieneRepresentanteLegal) {
      context.addIssue({ code: 'custom', path: ['tieneRepresentanteLegal'], message: 'Los menores requieren representación legal' });
    }
    if (data.tieneRepresentanteLegal === true && !data.representante) {
      context.addIssue({ code: 'custom', path: ['representante'], message: 'El representante legal es obligatorio' });
    }
    if (data.tieneRepresentanteLegal !== true && data.representante) {
      context.addIssue({ code: 'custom', path: ['representante'], message: 'El representante solo puede existir cuando hay representación legal' });
    }
    return;
  }
  if (data.esMenor && !data.representante) {
    context.addIssue({ code: 'custom', path: ['representante'], message: 'El representante legal es obligatorio' });
  }
  if (!data.esMenor && data.representante) {
    context.addIssue({ code: 'custom', path: ['representante'], message: 'No debe incluirse representante para un adulto' });
  }
}

export const ConsentPdfV2DataSchema = z.object({
  templateVersion: z.literal(CONSENT_PDF_V2_TEMPLATE_VERSION),
  ...consentShape,
  establecimiento: historicalEstablishmentSchema,
}).strict().superRefine((data, context) => validateRepresentation(data, context, false));

export const ConsentPdfV3DataSchema = z.object({
  templateVersion: z.literal(CONSENT_PDF_V3_TEMPLATE_VERSION),
  ...consentShape,
  establecimiento: historicalEstablishmentSchema,
}).strict().superRefine((data, context) => validateRepresentation(data, context, true));

export const ConsentPdfV4DataSchema = z.object({
  templateVersion: z.literal(CONSENT_PDF_TEMPLATE_VERSION),
  ...consentShape,
  establecimiento: registrationOnlyEstablishmentSchema,
}).strict().superRefine((data, context) => validateRepresentation(data, context, true));

export const ConsentPdfDataSchema = z.union([
  ConsentPdfV2DataSchema,
  ConsentPdfV3DataSchema,
  ConsentPdfV4DataSchema,
]);

export type ConsentTechnique = z.infer<typeof ConsentTechniqueSchema>;
export type ConsentPdfData = z.infer<typeof ConsentPdfDataSchema>;

export function hasLegalRepresentation(document: Pick<ConsentPdfData, 'templateVersion' | 'tieneRepresentanteLegal' | 'representante'>) {
  return document.templateVersion === CONSENT_PDF_V2_TEMPLATE_VERSION
    ? document.representante !== null
    : document.tieneRepresentanteLegal === true;
}

export function parseConsentPdfData(input: unknown): ConsentPdfData {
  return ConsentPdfDataSchema.parse(input);
}
