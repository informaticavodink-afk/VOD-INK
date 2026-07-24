import type { Database } from '../src/types/supabase';
import { parseConsentPdfData, type ConsentPdfData } from '../src/domain/consents/consentPdfSchema';

type ConsentRow = Database['public']['Tables']['consents']['Row'];
type ArtistRow = Database['public']['Tables']['artists']['Row'];
type StudioRow = Database['public']['Tables']['studios']['Row'];

interface BuildConsentPdfDataInput {
  consent: ConsentRow;
  artist: ArtistRow;
  studio: StudioRow;
  artistSignature: string;
  generatedAt?: Date;
}

function required(value: string | null | undefined) {
  return value ?? '';
}

export function buildConsentPdfData({
  consent,
  artist,
  studio,
  artistSignature,
  generatedAt = new Date(),
}: BuildConsentPdfDataInput): ConsentPdfData {
  const legalAcceptance = (consent.legal_acceptance ?? {}) as Record<string, unknown>;
  const representative = consent.is_minor ? {
    nombreYApellidos: required(consent.representative_full_name),
    dni: required(consent.representative_dni),
    fechaNacimiento: required(consent.representative_birth_date),
    domicilio: required(consent.representative_address),
    cp: required(consent.representative_postal_code),
    localidad: required(consent.representative_city),
    telefono: required(consent.representative_phone),
    parentesco: required(consent.representative_relationship),
    acreditaMediante: required(consent.representative_accreditation),
  } : null;

  return parseConsentPdfData({
    templateVersion: 'consent-v2',
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
      fechaAutorizacion: required(studio.health_authorization_date),
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
