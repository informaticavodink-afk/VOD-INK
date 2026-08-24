import type { Database } from '../src/types/supabase.js';
import {
  CONSENT_PDF_TEMPLATE_VERSION,
  CONSENT_PDF_V3_TEMPLATE_VERSION,
  parseConsentPdfData,
  type ConsentPdfData,
} from '../src/domain/consents/consentPdfSchema.js';

type ConsentRow = Database['public']['Tables']['consents']['Row'];
type ArtistRow = Database['public']['Tables']['artists']['Row'];
type StudioRow = Database['public']['Tables']['studios']['Row'];

export type RegistrationOnlyStudioContext = Pick<StudioRow,
  'legal_name' | 'trade_name' | 'tax_id' | 'address' | 'city' | 'postal_code' |
  'phone' | 'health_registration_number'>;

interface BuildConsentPdfDataInput {
  consent: ConsentRow;
  artist: ArtistRow;
  studio: StudioRow;
  artistSignature: string;
  generatedAt?: Date;
}

interface BuildRegistrationOnlyConsentPdfDataInput extends Omit<BuildConsentPdfDataInput, 'studio'> {
  studio: RegistrationOnlyStudioContext;
}

function required(value: string | null | undefined) {
  return value ?? '';
}

const representativeColumns = [
  'representative_full_name', 'representative_dni', 'representative_birth_date',
  'representative_address', 'representative_postal_code', 'representative_city',
  'representative_phone', 'representative_relationship', 'representative_accreditation',
] as const;

function buildRepresentative(consent: ConsentRow) {
  const represented = consent.has_legal_representative === true;
  const hasPersistedData = representativeColumns.some((column) => consent[column] != null);
  if (!represented) {
    if (hasPersistedData) throw new Error('La representación persistida está incompleta o no coincide con su estado');
    return null;
  }
  return {
    nombreYApellidos: required(consent.representative_full_name),
    dni: required(consent.representative_dni),
    fechaNacimiento: required(consent.representative_birth_date),
    domicilio: required(consent.representative_address),
    cp: required(consent.representative_postal_code),
    localidad: required(consent.representative_city),
    telefono: required(consent.representative_phone),
    parentesco: required(consent.representative_relationship),
    acreditaMediante: required(consent.representative_accreditation),
  };
}

function composeConsentPdfData({
  consent,
  artist,
  studio,
  artistSignature,
  generatedAt = new Date(),
}: BuildConsentPdfDataInput | BuildRegistrationOnlyConsentPdfDataInput, registrationOnly: boolean): ConsentPdfData {
  const legalAcceptance = (consent.legal_acceptance ?? {}) as Record<string, unknown>;
  const represented = consent.has_legal_representative === true;
  const representative = buildRepresentative(consent);

  return parseConsentPdfData({
    templateVersion: registrationOnly ? CONSENT_PDF_TEMPLATE_VERSION : CONSENT_PDF_V3_TEMPLATE_VERSION,
    generatedAt: generatedAt.toISOString(),
    establecimiento: {
      nombreRazonSocial: studio.legal_name,
      nombreComercial: studio.trade_name,
      domicilio: required(studio.address),
      localidad: required(studio.city),
      cp: required(studio.postal_code),
      cif: required(studio.tax_id),
      telefono: required(studio.phone),
      numRegistroSanidad: required(studio.health_registration_number),
      ...(registrationOnly ? {} : {
        fechaAutorizacion: required((studio as StudioRow).health_authorization_date),
      }),
    },
    aplicador: {
      id: artist.id,
      nombreYApellidos: artist.full_name,
      titulacion: artist.qualification,
      dni: artist.dni,
    },
    cliente: {
      nombreYApellidos: consent.client_full_name,
      dni: consent.client_dni,
      fechaNacimiento: required(consent.client_birth_date),
      domicilio: required(consent.client_address),
      cp: required(consent.client_postal_code),
      localidad: required(consent.client_city),
      telefono: required(consent.client_phone),
    },
    esMenor: consent.is_minor,
    tieneRepresentanteLegal: represented,
    representante: representative,
    tecnica: consent.technique_data,
    salud: Array.isArray(consent.health_flags) ? consent.health_flags : [],
    declaracionLeido: legalAcceptance.declaracionLeido,
    confirmadoPrecio: Boolean(legalAcceptance.confirmadoPrecio),
    firmaCliente: legalAcceptance.firmaCliente,
    firmaAplicador: artistSignature,
    lugar: required(studio.city),
    fecha: generatedAt.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' }),
  });
}

export function buildConsentPdfData(input: BuildConsentPdfDataInput): ConsentPdfData {
  return composeConsentPdfData(input, false);
}

export function buildRegistrationOnlyConsentPdfData(
  input: BuildRegistrationOnlyConsentPdfDataInput,
): ConsentPdfData {
  return composeConsentPdfData(input, true);
}

export function createDocumentSnapshot(document: ConsentPdfData) {
  const { firmaCliente, firmaAplicador, ...snapshot } = document;
  return {
    ...snapshot,
    signatures: {
      clientHashRequired: Boolean(firmaCliente),
      artistHashRequired: Boolean(firmaAplicador),
    },
  };
}
