import { describe, expect, it } from 'vitest';
import type { Database } from '../src/types/supabase';
import { buildConsentPdfData, buildRegistrationOnlyConsentPdfData, createDocumentSnapshot } from './consentPdfData';

type Consent = Database['public']['Tables']['consents']['Row'];
type Artist = Database['public']['Tables']['artists']['Row'];
type Studio = Database['public']['Tables']['studios']['Row'];
const signature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XwW8WQAAAABJRU5ErkJggg==';

const consent = {
  id: '22222222-2222-4222-8222-222222222222', studio_id: '33333333-3333-4333-8333-333333333333', artist_id: '11111111-1111-4111-8111-111111111111',
  client_full_name: 'CLIENTE BD', client_dni: '87654321X', client_birth_date: '1990-01-01', client_address: 'CALLE CLIENTE BD', client_postal_code: '39001', client_city: 'SANTANDER', client_phone: '600000001',
  is_minor: false, has_legal_representative: false, representative_full_name: null, representative_dni: null, representative_birth_date: null, representative_address: null, representative_postal_code: null, representative_city: null, representative_phone: null, representative_relationship: null, representative_accreditation: null,
  health_flags: ['SALUD BD'], technique_data: { denominacionGenerica: 'TECNICA BD', localizacionAnatomica: 'ZONA BD', tintas: [{ nombre: 'TINTA BD', numRegistroAEMPS: 'AEMPS-BD', lote: 'LOTE-BD', caducidad: '2028-01-01' }], otrosMateriales: 'MATERIAL BD', duracion: 'DURACION BD', posibilidadesEliminacion: 'ELIMINACION BD', presupuesto: '300 EUR' },
  legal_acceptance: { declaracionLeido: true, confirmadoPrecio: true, firmaCliente: signature },
} as unknown as Consent;

const artist = { id: consent.artist_id, full_name: 'ARTISTA BD', qualification: 'TITULACION BD', dni: '12345678Z' } as Artist;
const studio = { id: consent.studio_id, legal_name: 'ESTUDIO BD SL', trade_name: 'MARCA BD', address: 'CALLE ESTUDIO BD', city: 'SANTANDER', postal_code: '39002', tax_id: 'B12345678', phone: '942000001', health_registration_number: 'SAN-BD', health_authorization_date: '2024-01-01' } as Studio;

describe('buildConsentPdfData', () => {
  it('composes strict v4 from the narrow READY registration context without leaking contract metadata', () => {
    const context = {
      legal_name: 'ESTUDIO BD SL', trade_name: 'MARCA BD', address: 'CALLE ESTUDIO BD', city: 'SANTANDER',
      postal_code: '39002', tax_id: 'B12345678', phone: '942000001', health_registration_number: 'SAN-BD',
      contract_version: 'registration-only-v2', outcome_code: 'READY', health_data_verified_at: 'forbidden',
    };
    const document = buildRegistrationOnlyConsentPdfData({
      consent, artist, studio: context, artistSignature: signature, generatedAt: new Date('2026-07-24T12:00:00Z'),
    });
    expect(document.templateVersion).toBe('consent-v4-registration-only');
    expect(document.establecimiento).toEqual({
      nombreRazonSocial: 'ESTUDIO BD SL', nombreComercial: 'MARCA BD', domicilio: 'CALLE ESTUDIO BD',
      localidad: 'SANTANDER', cp: '39002', cif: 'B12345678', telefono: '942000001', numRegistroSanidad: 'SAN-BD',
    });
  });

  it('compone cada sección desde las filas persistidas', () => {
    const document = buildConsentPdfData({ consent, artist, studio, artistSignature: signature, generatedAt: new Date('2026-07-24T12:00:00Z') });
    expect(document.establecimiento).toEqual({
      nombreRazonSocial: 'ESTUDIO BD SL',
      nombreComercial: 'MARCA BD',
      domicilio: 'CALLE ESTUDIO BD',
      localidad: 'SANTANDER',
      cp: '39002',
      cif: 'B12345678',
      telefono: '942000001',
      numRegistroSanidad: 'SAN-BD',
      fechaAutorizacion: '2024-01-01',
    });
    expect(document.aplicador.nombreYApellidos).toBe('ARTISTA BD');
    expect(document.cliente.nombreYApellidos).toBe('CLIENTE BD');
    expect(document.tecnica.tintas[0].lote).toBe('LOTE-BD');
    expect(document.firmaAplicador).toBe(signature);
  });

  it('emits v3 representation state for an unrepresented adult', () => {
    const document = buildConsentPdfData({ consent, artist, studio, artistSignature: signature });
    expect(document.templateVersion).toBe('consent-v3-representation');
    expect(document.tieneRepresentanteLegal).toBe(false);
    expect(document.representante).toBeNull();
  });

  it('builds an adult representative from the persisted representation flag', () => {
    const representedConsent = {
      ...consent,
      has_legal_representative: true,
      representative_full_name: 'REPRESENTANTE ADULTA BD', representative_dni: '11111111H',
      representative_birth_date: '1970-01-01', representative_address: 'CALLE TUTOR BD',
      representative_postal_code: '39003', representative_city: 'SANTANDER', representative_phone: '600000004',
      representative_relationship: 'MADRE', representative_accreditation: 'LIBRO DE FAMILIA',
    };
    const document = buildConsentPdfData({ consent: representedConsent, artist, studio, artistSignature: signature });
    expect(document.esMenor).toBe(false);
    expect(document.tieneRepresentanteLegal).toBe(true);
    expect(document.representante).toMatchObject({ fechaNacimiento: '1970-01-01', telefono: '600000004' });
  });

  it('rejects a partial persisted representative record', () => {
    expect(() => buildConsentPdfData({
      consent: {
        ...consent,
        has_legal_representative: true,
        representative_full_name: 'REPRESENTANTE PARCIAL BD', representative_dni: '11111111H',
        representative_birth_date: '1970-01-01', representative_phone: null,
        representative_address: 'CALLE TUTOR BD', representative_postal_code: '39003', representative_city: 'SANTANDER',
        representative_relationship: 'MADRE', representative_accreditation: 'LIBRO DE FAMILIA',
      },
      artist, studio, artistSignature: signature,
    })).toThrow(/Teléfono/i);
  });

  it('rejects representative columns when persisted representation is false', () => {
    expect(() => buildConsentPdfData({
      consent: { ...consent, representative_full_name: '' },
      artist, studio, artistSignature: signature,
    })).toThrow(/representación persistida/i);
  });

  it('never derives representation from minority', () => {
    expect(() => buildConsentPdfData({
      consent: { ...consent, is_minor: true, representative_full_name: 'REPRESENTANTE SIN BANDERA BD' },
      artist, studio, artistSignature: signature,
    })).toThrow(/representación persistida/i);
  });

  it('compone un representante completo para clientes menores', () => {
    const minorConsent = {
      ...consent,
      is_minor: true, has_legal_representative: true,
      representative_full_name: 'REPRESENTANTE BD', representative_dni: '11111111H',
      representative_birth_date: '1970-01-01', representative_address: 'CALLE TUTOR BD',
      representative_postal_code: '39003', representative_city: 'SANTANDER', representative_phone: '600000004',
      representative_relationship: 'MADRE', representative_accreditation: 'LIBRO DE FAMILIA',
    };
    const document = buildConsentPdfData({ consent: minorConsent, artist, studio, artistSignature: signature });
    expect(document.tieneRepresentanteLegal).toBe(true);
    expect(document.representante).toMatchObject({ nombreYApellidos: 'REPRESENTANTE BD', fechaNacimiento: '1970-01-01', telefono: '600000004' });
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('normaliza %s como campo obligatorio ausente', (_label, missingValue) => {
    expect(() => buildConsentPdfData({
      consent: { ...consent, client_phone: missingValue }, artist, studio, artistSignature: signature,
    })).toThrow(/Teléfono/i);
  });

  it('normaliza health_flags no-array a una lista vacía', () => {
    const document = buildConsentPdfData({
      consent: { ...consent, health_flags: { unexpected: true } }, artist, studio, artistSignature: signature,
    });
    expect(document.salud).toEqual([]);
  });

  it('rechaza aceptaciones legales nulas', () => {
    expect(() => buildConsentPdfData({
      consent: { ...consent, legal_acceptance: null }, artist, studio, artistSignature: signature,
    })).toThrow();
  });

  it('bloquea un estudio incompleto', () => {
    expect(() => buildConsentPdfData({ consent, artist, studio: { ...studio, tax_id: null }, artistSignature: signature })).toThrow(/CIF/i);
  });

  it('persists the v3 identity and representation state in the snapshot', () => {
    const document = buildConsentPdfData({ consent, artist, studio, artistSignature: signature });
    expect(createDocumentSnapshot(document)).toMatchObject({
      templateVersion: 'consent-v3-representation',
      tieneRepresentanteLegal: false,
    });
  });

  it('no persiste las imágenes base64 en el snapshot', () => {
    const document = buildConsentPdfData({ consent, artist, studio, artistSignature: signature });
    expect(JSON.stringify(createDocumentSnapshot(document))).not.toContain('data:image');
  });

  it('marca firmas ausentes como no requeridas en snapshots defensivos', () => {
    const document = buildConsentPdfData({ consent, artist, studio, artistSignature: signature });
    const snapshot = createDocumentSnapshot({ ...document, firmaCliente: '', firmaAplicador: '' });
    expect(snapshot.signatures).toEqual({ clientHashRequired: false, artistHashRequired: false });
  });
});
