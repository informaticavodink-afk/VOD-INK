import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { createHash } from 'node:crypto';

vi.mock('./supabase.js', () => ({ createServiceClient: vi.fn() }));
vi.mock('./drive.js', () => ({ uploadToDrive: vi.fn() }));
vi.mock('./publicStudio.js', () => ({ resolvePublicStudio: vi.fn() }));
vi.mock('./publicArtists.js', () => ({ resolveAvailablePublicArtist: vi.fn() }));
vi.mock('../src/lib/pdf.js', () => ({ generateConsentPDF: vi.fn() }));
vi.mock('./consentPdfData.js', () => ({ buildConsentPdfData: vi.fn(), createDocumentSnapshot: vi.fn() }));

import { createServiceClient } from './supabase.js';
import { resolveAvailablePublicArtist } from './publicArtists.js';
import { resolvePublicStudio } from './publicStudio.js';
import { uploadToDrive } from './drive.js';
import { buildConsentPdfData, createDocumentSnapshot } from './consentPdfData.js';
import { generateConsentPDF } from '../src/lib/pdf.js';
import {
  generateAndSubmitConsent,
  saveConsentTechnique,
  signConsentAsArtist,
  FinalizationError,
  toFinalizationErrorEnvelope,
  deriveConsentRepresentation,
  buildRepresentativePersistence,
  getPublicConsentSigner,
} from './consents';
import type { WizardState } from '../src/types';
import { RepresentanteSchema } from '../src/lib/schema';
import { PublicConsentError } from './publicConsentErrors';

const mockedCreateServiceClient = vi.mocked(createServiceClient);
const mockedResolvePublicStudio = vi.mocked(resolvePublicStudio);
const mockedResolveArtist = vi.mocked(resolveAvailablePublicArtist);
const mockedGeneratePdf = vi.mocked(generateConsentPDF);
const mockedUploadToDrive = vi.mocked(uploadToDrive);
const mockedBuildPdfData = vi.mocked(buildConsentPdfData);
const mockedCreateSnapshot = vi.mocked(createDocumentSnapshot);

function selectChain(data: unknown, error: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
  };
}

function authorizedClient(status: 'pending_technique' | 'pending_artist' | 'signed' = 'pending_technique') {
  const consent = selectChain({ id: 'consent-1', artist_id: 'artist-1', status });
  const artist = selectChain({ id: 'artist-1', profile_id: 'profile-1' });
  const profile = selectChain({ user_id: 'user-1', role: 'artist' });
  const updateEq = vi.fn().mockResolvedValue({ error: null });
  const update = { update: vi.fn().mockReturnValue({ eq: updateEq }) };
  const from = vi.fn()
    .mockReturnValueOnce(consent)
    .mockReturnValueOnce(artist)
    .mockReturnValueOnce(profile)
    .mockReturnValueOnce(update);
  const client = { from };
  mockedCreateServiceClient.mockReturnValue(client as never);
  return { client, from, update, updateEq };
}

const validTechnique = {
  denominacionGenerica: 'Tatuaje', localizacionAnatomica: 'Brazo derecho',
  tintas: [{ nombre: 'Negro real', numRegistroAEMPS: 'AEMPS-1', lote: 'LOTE-1', caducidad: '2029-01-01' }],
  otrosMateriales: 'Material estéril', duracion: 'Dos horas', posibilidadesEliminacion: 'Láser', presupuesto: '200 EUR',
};

function syntheticMinorState(): WizardState {
  return {
    pasoActual: 4,
    artistaSeleccionado: { id: 'artist-memory', nombreYApellidos: 'SYNTHETIC ARTIST', titulacion: 'SYNTHETIC TITLE' },
    datosCliente: {
      nombreYApellidos: 'SYNTHETIC MINOR', dni: '12345678Z', fechaNacimiento: '2010-04-05',
      domicilio: 'SYNTHETIC STREET 1', cp: '39001', localidad: 'SYNTHETIC CITY', telefono: '600000000',
    },
    esMenor: true,
    tieneRepresentanteLegal: true,
    datosRepresentante: {
      nombreYApellidos: 'SYNTHETIC REPRESENTATIVE', dni: '12345678Z', fechaNacimiento: '1980-02-03',
      domicilio: 'SYNTHETIC STREET 2', cp: '39002', localidad: 'SYNTHETIC CITY', telefono: '611111111',
      parentesco: 'SYNTHETIC RELATION', acreditaMediante: 'SYNTHETIC DOCUMENT',
    },
    datosTecnica: validTechnique,
    declaracionLeido: true, declaracionContraindicaciones: true, declaracionSaludSeleccionadas: [],
    confirmadoPrecio: true, firmaCliente: 'data:image/png;base64,iVBORw0KGgoSYNTHETIC', firmaAplicador: '',
    lugar: 'SYNTHETIC CITY', fecha: '2026-08-21',
  };
}

function invalidWizardState(): WizardState {
  return {
    pasoActual: 4, artistaSeleccionado: null,
    datosCliente: { nombreYApellidos: '', dni: '', fechaNacimiento: '', domicilio: '', cp: '', localidad: '', telefono: '' },
    esMenor: false,
    datosRepresentante: { nombreYApellidos: '', dni: '', fechaNacimiento: '', domicilio: '', cp: '', localidad: '', telefono: '', parentesco: '', acreditaMediante: '' },
    datosTecnica: { denominacionGenerica: '', localizacionAnatomica: '', tintas: [], otrosMateriales: '', duracion: '', posibilidadesEliminacion: '', presupuesto: '' },
    declaracionLeido: false, declaracionContraindicaciones: false, declaracionSaludSeleccionadas: [], confirmadoPrecio: false,
    firmaCliente: '', firmaAplicador: '', lugar: '', fecha: '',
  };
}

    describe('authoritative representation domain', () => {
      const representative = {
        nombreYApellidos: 'Persona Sintética', dni: '12345678Z', fechaNacimiento: '1980-01-01',
        domicilio: 'Domicilio sintético', cp: '39001', localidad: 'Santander', telefono: '600000000',
        parentesco: 'Tutoría', acreditaMediante: 'Documento sintético',
      };

          it.each([
            { fechaNacimiento: '2008-06-15', esMenor: false, tieneRepresentanteLegal: true },
            { fechaNacimiento: '2010-06-15', esMenor: true, tieneRepresentanteLegal: false },
          ])('classifies canonical representation failures without embedding $fechaNacimiento', async (input) => {
            const rejection = Promise.resolve().then(() => deriveConsentRepresentation(input, '2026-06-14'));

            await expect(rejection).rejects.toBeInstanceOf(PublicConsentError);
            await expect(rejection).rejects.toMatchObject({ code: 'REPRESENTATION_INVALID', stage: 'representation' });
            await expect(rejection).rejects.not.toThrow(input.fechaNacimiento);
          });

      it('requires representation for minors and allows represented adults', () => {
        expect(() => deriveConsentRepresentation({
          fechaNacimiento: '2010-06-15', esMenor: true, tieneRepresentanteLegal: false,
        }, '2026-06-15')).toThrow(/represent/i);
        expect(deriveConsentRepresentation({
          fechaNacimiento: '1990-06-15', esMenor: false, tieneRepresentanteLegal: true,
        }, '2026-06-15')).toEqual({ isMinor: false, represented: true });
      });

      it('rejects represented persistence without a complete representative', () => {
        expect(() => buildRepresentativePersistence(true)).toThrow(PublicConsentError);
        expect(() => buildRepresentativePersistence(true, { ...representative, telefono: '' })).toThrow(PublicConsentError);
        expect(RepresentanteSchema.safeParse({ ...representative, telefono: '' }).success).toBe(false);
      });

      it('persists all nine representative fields or all null and attributes one signer', () => {
        expect(buildRepresentativePersistence(true, representative)).toEqual({
          representative_full_name: representative.nombreYApellidos, representative_dni: representative.dni,
          representative_birth_date: representative.fechaNacimiento, representative_phone: representative.telefono,
          representative_address: representative.domicilio, representative_postal_code: representative.cp,
          representative_city: representative.localidad, representative_relationship: representative.parentesco,
          representative_accreditation: representative.acreditaMediante,
        });
        expect(getPublicConsentSigner(representative, 'firma-sintética', true)).toEqual({
          signerType: 'representative', signerName: representative.nombreYApellidos, signature: 'firma-sintética',
        });
expect(buildRepresentativePersistence(false, representative)).toEqual({
          representative_full_name: null, representative_dni: null, representative_birth_date: null,
          representative_phone: null, representative_address: null, representative_postal_code: null,
          representative_city: null, representative_relationship: null, representative_accreditation: null,
        });
      });
    });

    describe('consent service validation with external dependencies mocked', () => {
      beforeEach(() => {
    vi.clearAllMocks();
  });

      it('persists represented adult consent with the representative as sole public signer', async () => {
        const representative = {
          nombreYApellidos: 'Persona Sintética', dni: '12345678Z', fechaNacimiento: '1980-01-01',
          domicilio: 'Domicilio sintético', cp: '39001', localidad: 'Santander', telefono: '600000000',
          parentesco: 'Tutoría', acreditaMediante: 'Documento sintético',
        };
        const state: WizardState = {
          pasoActual: 4, artistaSeleccionado: { id: 'browser-artist', nombreYApellidos: 'Artista', titulacion: 'Título' },
          datosCliente: {
            nombreYApellidos: 'Adulto Sintético', dni: '12345678Z', fechaNacimiento: '1990-01-01',
            domicilio: 'Calle sintética 1', cp: '39001', localidad: 'Santander', telefono: '600000000',
          },
          esMenor: false, tieneRepresentanteLegal: true, datosRepresentante: representative,
          datosTecnica: validTechnique, declaracionLeido: true, declaracionContraindicaciones: true,
          declaracionSaludSeleccionadas: [], confirmadoPrecio: true, firmaCliente: 'data:image/png;base64,iVBORw0KGgo-synthetic',
          firmaAplicador: '', lugar: 'Santander', fecha: '2026-07-28',
        };
        const consentInsert = vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { id: 'consent-synthetic' }, error: null }),
        });
        const signatureUpsert = vi.fn().mockResolvedValue({ error: null });
        const from = vi.fn((table: string) => {
          if (table === 'consents') {
            return {
              select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), insert: consentInsert,
            };
          }
          if (table === 'consent_signatures') return { upsert: signatureUpsert };
          throw new Error(`Unexpected table: ${table}`);
        });
        mockedCreateServiceClient.mockReturnValue({ from } as never);
        mockedResolvePublicStudio.mockResolvedValue({ id: 'studio-resolved' } as never);
        mockedResolveArtist.mockResolvedValue({ id: 'artist-resolved' } as never);

        await expect(generateAndSubmitConsent(state, 'key-synthetic')).resolves.toMatchObject({
          consentId: 'consent-synthetic', status: 'pending_technique',
        });
        expect(consentInsert).toHaveBeenCalledWith(expect.objectContaining({
          studio_id: 'studio-resolved', artist_id: 'artist-resolved', is_minor: false,
          has_legal_representative: true, representative_full_name: representative.nombreYApellidos,
          representative_dni: representative.dni, representative_birth_date: representative.fechaNacimiento,
          representative_phone: representative.telefono, representative_address: representative.domicilio,
          representative_postal_code: representative.cp, representative_city: representative.localidad,
          representative_relationship: representative.parentesco, representative_accreditation: representative.acreditaMediante,
        }));
        expect(signatureUpsert).toHaveBeenCalledTimes(1);
        expect(signatureUpsert).toHaveBeenCalledWith(expect.objectContaining({
          consent_id: 'consent-synthetic', studio_id: 'studio-resolved', artist_id: 'artist-resolved',
          signer_type: 'representative', signer_name: representative.nombreYApellidos,
        }), { onConflict: 'consent_id,signer_type' });
        expect(signatureUpsert).not.toHaveBeenCalledWith(expect.objectContaining({ signer_type: 'client' }), expect.anything());
      });

      it('valida y persiste una técnica completa después de autorizar al artista', async () => {
    const { update, updateEq } = authorizedClient();

    await expect(saveConsentTechnique('consent-1', validTechnique, 'user-1')).resolves.toEqual({
      success: true, status: 'pending_artist',
    });
    expect(update.update).toHaveBeenCalledWith({ technique_data: validTechnique, status: 'pending_artist' });
    expect(updateEq).toHaveBeenCalledWith('id', 'consent-1');
  });

  it('rechaza técnica incompleta sin escribir en Supabase', async () => {
    const { from } = authorizedClient();
    await expect(saveConsentTechnique('consent-1', { ...validTechnique, tintas: [] }, 'user-1')).rejects.toThrow();
    expect(from).toHaveBeenCalledTimes(3);
  });

  it('rechaza usuarios que no corresponden al artista', async () => {
    const consent = selectChain({ id: 'consent-1', artist_id: 'artist-1', status: 'pending_technique' });
    const artist = selectChain({ id: 'artist-1', profile_id: 'profile-1' });
    const profile = selectChain({ user_id: 'otro-user', role: 'artist' });
    mockedCreateServiceClient.mockReturnValue({
      from: vi.fn().mockReturnValueOnce(consent).mockReturnValueOnce(artist).mockReturnValueOnce(profile),
    } as never);

    await expect(saveConsentTechnique('consent-1', validTechnique, 'user-1')).rejects.toThrow(/permisos/i);
  });

  it('no genera un PDF si el consentimiento no está preparado para firma', async () => {
    authorizedClient('pending_technique');
    await expect(signConsentAsArtist('consent-1', 'firma', 'user-1')).rejects.toThrow(/preparado/i);
    expect(mockedGeneratePdf).not.toHaveBeenCalled();
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
  ])('rechaza un estado público %s antes de tocar Supabase', async (_label, state) => {
    await expect(generateAndSubmitConsent(state as unknown as WizardState, 'key')).rejects.toThrow();
    expect(mockedCreateServiceClient).not.toHaveBeenCalled();
  });

      it('rechaza datos públicos vacíos antes de tocar Supabase', async () => {
        await expect(generateAndSubmitConsent(invalidWizardState(), 'key')).rejects.toThrow();
        expect(mockedCreateServiceClient).not.toHaveBeenCalled();
      });
    });

    const HEALTH_MESSAGE = 'Faltan datos sanitarios verificados del estudio. Solicita su actualización y vuelve a intentar finalizar este mismo consentimiento.';

    describe('unit 6 finalization adapter contract', () => {
      it('serializes stable health and conflict codes with retryability', () => {
        expect(toFinalizationErrorEnvelope(new FinalizationError('STUDIO_HEALTH_UNVERIFIED'))).toEqual({
          status: 409,
          body: { error: { code: 'STUDIO_HEALTH_UNVERIFIED', message: HEALTH_MESSAGE, retryable: true } },
        });
        expect(toFinalizationErrorEnvelope(new FinalizationError('FINALIZATION_CONTENT_CONFLICT'))).toMatchObject({
          status: 409,
          body: { error: { code: 'FINALIZATION_CONTENT_CONFLICT', retryable: false } },
        });
      });
    });

    function finalizationChain(
      result: unknown,
      error: unknown = null,
      events: string[] = [],
      updates: unknown[] = [],
    ) {
      const chain: Record<string, any> = {};
      chain.select = vi.fn((columns: string) => {
        chain.selectColumns = columns;
        return chain;
      });
      chain.eq = vi.fn().mockReturnValue(chain);
      chain.is = vi.fn().mockReturnValue(chain);
      chain.in = vi.fn().mockReturnValue(chain);
      chain.single = vi.fn().mockResolvedValue({ data: result, error });
      chain.maybeSingle = vi.fn().mockResolvedValue({ data: result, error });
      chain.update = vi.fn((payload: unknown) => {
        events.push('consent-update');
        updates.push(payload);
        chain.updatePayload = payload;
        return chain;
      });
      chain.insert = vi.fn((payload: unknown) => {
        events.push('file-insert');
        chain.insertPayload = payload;
        return chain;
      });
      chain.delete = vi.fn().mockReturnValue(chain);
      return chain;
    }

    function blockedFinalizationClient(
      studio: Record<string, unknown>,
      studioSequence: Record<string, unknown>[] = [studio],
    ) {
      const events: string[] = [];
      const studioReads: Record<string, unknown>[] = [];
      const consent = {
        id: 'consent-health', artist_id: 'artist-health', studio_id: 'studio-health',
        status: 'pending_artist', finalization_started_at: null, finalization_content_sha256: null,
        final_file_id: null, legal_acceptance: {}, technique_data: {}, health_flags: [],
      };
      const artist = { id: 'artist-health', profile_id: 'profile-health', full_name: 'Artista Sintética', qualification: 'Cualificación', dni: '00000000T', drive_folder_id: 'drive-health' };
      let fileCalls = 0;
      const consentUpdates: unknown[] = [];
      const signatureUpsert = vi.fn(() => { events.push('signature'); return Promise.resolve({ error: null }); });
      const upload = vi.fn(() => { events.push('storage'); return Promise.resolve({ data: {}, error: null }); });
      const from = vi.fn((table: string) => {
        if (table === 'consents') {
          const chain = finalizationChain(consent, null, events, consentUpdates);
          chain.maybeSingle.mockImplementation(async () => {
            if (chain.updatePayload?.legal_acceptance) {
              consent.legal_acceptance = chain.updatePayload.legal_acceptance;
              return { data: { legal_acceptance: consent.legal_acceptance }, error: null };
            }
            if (chain.updatePayload?.finalization_started_at) {
              consent.finalization_started_at = chain.updatePayload.finalization_started_at;
              return { data: { finalization_started_at: consent.finalization_started_at }, error: null };
            }
            return { data: consent, error: null };
          });
          chain.single.mockImplementation(async () => {
            if (chain.selectColumns === 'legal_acceptance') {
              return { data: { legal_acceptance: consent.legal_acceptance }, error: null };
            }
            if (chain.selectColumns === 'finalization_started_at') {
              return { data: { finalization_started_at: consent.finalization_started_at }, error: null };
            }
            return { data: consent, error: null };
          });
          return chain;
        }
        if (table === 'artists') return finalizationChain(artist);
        if (table === 'profiles') return finalizationChain({ user_id: 'user-health', role: 'artist' });
        if (table === 'studios') {
          const currentStudio = studioSequence[Math.min(studioReads.length, studioSequence.length - 1)];
          studioReads.push(currentStudio);
          return finalizationChain(currentStudio);
        }
        if (table === 'consent_files') {
          fileCalls += 1;
          return finalizationChain(fileCalls === 1 ? null : {
            id: 'file-health', storage_path: 'synthetic-path', sha256: 'synthetic-hash',
            drive_file_id: null, drive_view_link: null,
          }, null, events);
        }
        if (table === 'consent_signatures') return { upsert: signatureUpsert };
        throw new Error(`Unexpected table: ${table}`);
      });
      const client = { from, storage: { from: vi.fn(() => ({ upload })) } };
      mockedCreateServiceClient.mockReturnValue(client as never);
      return { client, consent, events, studioReads, consentUpdates, upload, signatureUpsert };
    }

    function memoryFinalizationClient(options: {
        failFileInsertBefore?: boolean;
      failFileInsertAfterPersist?: boolean;
      failSignedUpdateAfterPersist?: boolean;
      failStorageUploadAfterWinner?: boolean;
    } = {}) {
      const state: any = {
        consent: {
          id: 'consent-memory', artist_id: 'artist-memory', studio_id: 'studio-memory',
          status: 'pending_artist', finalization_started_at: null, finalization_content_sha256: null,
          final_file_id: null, legal_acceptance: {}, technique_data: {}, health_flags: [],
        },
        studio: {
          id: 'studio-memory', health_registration_number: 'SYNTHETIC-HEALTH',
          health_authorization_date: '2026-07-28', health_data_verified_at: '2026-07-28T10:00:00.000Z',
        },
        artist: { id: 'artist-memory', profile_id: 'profile-memory', full_name: 'Artista Sintética', qualification: 'Cualificación', dni: '00000000T', drive_folder_id: 'drive-memory' },
        profile: { user_id: 'user-memory', role: 'artist' },
        finalFile: null,
        objectCreated: false,
        signatureRecord: null,
      };
      const calls: any = {
        from: [],
        storageUploads: 0,
        storageOptions: [],
        fileInserts: 0,
        signedUpdates: 0,
        uploadErrorFilters: [],
        driveClaims: [],
        signatureUpserts: [],
      };
      let failedFileBefore = false;
      let failedFileAfter = false;
      let failedSigned = false;
      const hasEq = (query: any, key: string, value: unknown) => query.filters.some((filter: any) => filter.kind === 'eq' && filter.key === key && filter.value === value);
      const hasNull = (query: any, key: string) => query.filters.some((filter: any) => filter.kind === 'is' && filter.key === key && filter.value === null);
      const hasIn = (query: any, key: string, value: unknown) => query.filters.some((filter: any) => filter.kind === 'in' && filter.key === key && filter.values.includes(value));
      const lessThan = (query: any, key: string) => query.filters.find((filter: any) => filter.kind === 'lt' && filter.key === key)?.value as string | undefined;
      const execute = async (query: any) => {
        const result = (data: unknown = null, error: unknown = null) => ({ data, error });
        if (query.table === 'consents') {
          if (query.operation === 'select') {
            if (query.columns === '*' || hasEq(query, 'id', state.consent.id) && query.columns.includes('status')) return result({ ...state.consent });
            if (query.columns.includes('finalization_started_at')) return result({ finalization_started_at: state.consent.finalization_started_at });
            if (query.columns.includes('finalization_content_sha256')) return result({ finalization_content_sha256: state.consent.finalization_content_sha256 });
            if (query.columns.includes('legal_acceptance')) return result({ legal_acceptance: state.consent.legal_acceptance });
            return result({ status: state.consent.status, final_file_id: state.consent.final_file_id });
          }
          if (query.operation === 'update') {
            if (query.payload.legal_acceptance && !query.payload.status) {
              if (!hasNull(query, 'legal_acceptance->>firmaAplicador')) return result(null);
              if (!state.consent.legal_acceptance?.firmaAplicador) {
                state.consent.legal_acceptance = query.payload.legal_acceptance;
                return result({ legal_acceptance: state.consent.legal_acceptance });
              }
              return result(null);
            }
            if (query.payload.finalization_started_at) {
              if (!hasNull(query, 'finalization_started_at')) return result(null);
              if (!state.consent.finalization_started_at) {
                state.consent.finalization_started_at = query.payload.finalization_started_at;
                return result({ finalization_started_at: state.consent.finalization_started_at });
              }
              return result(null);
            }
            if (query.payload.finalization_content_sha256) {
              if (!hasNull(query, 'finalization_content_sha256')) return result(null);
              if (!state.consent.finalization_content_sha256) {
                state.consent.finalization_content_sha256 = query.payload.finalization_content_sha256;
                return result({ finalization_content_sha256: state.consent.finalization_content_sha256 });
              }
              return result(null);
            }
                if (query.payload.status === 'upload_error') {
                  calls.uploadErrorFilters.push(query.filters);
                  const statusFilter = query.filters.find((filter: any) => filter.kind === 'in' && filter.key === 'status');
                  if (!statusFilter || hasIn(query, 'status', state.consent.status)) {
                    state.consent.status = 'upload_error';
                  }
                  return result();
                }
            if (query.payload.status === 'signed') {
              if (state.consent.status !== 'pending_artist' && state.consent.status !== 'upload_error') return result(null);
              calls.signedUpdates += 1;
              state.consent.status = 'signed';
              state.consent.final_file_id = query.payload.final_file_id;
              Object.assign(state.consent, query.payload);
              if (options.failSignedUpdateAfterPersist && !failedSigned) {
                failedSigned = true;
                throw new Error('synthetic-crash-after-signed-update');
              }
              return result({ id: state.consent.id, status: state.consent.status, final_file_id: state.consent.final_file_id });
            }
            return result();
          }
        }
        if (query.table === 'artists') return result({ ...state.artist });
        if (query.table === 'profiles') return result({ ...state.profile });
        if (query.table === 'studios') return result({ ...state.studio });
        if (query.table === 'consent_files') {
          if (query.operation === 'select') {
            if (hasEq(query, 'id', state.consent.final_file_id)) return result(state.finalFile);
            if (!state.finalFile) return result(null);
            if (query.columns.includes('sha256') && query.filters.some((filter: any) => filter.key === 'sha256' && filter.value !== state.finalFile.sha256)) return result(null);
            return result(state.finalFile);
          }
          if (query.operation === 'insert') {
            calls.fileInserts += 1;
            if (state.finalFile) return result(null, { message: 'duplicate final file' });
            if (options.failFileInsertBefore && !failedFileBefore) {
              failedFileBefore = true;
              return result(null, { message: 'synthetic file insert crash' });
            }
            state.finalFile = { ...query.payload, id: 'file-memory', drive_file_id: null, drive_view_link: null, drive_copy_claimed_at: null, drive_copy_completed_at: null };
            if (options.failFileInsertAfterPersist && !failedFileAfter) {
              failedFileAfter = true;
              throw new Error('synthetic-crash-after-file-insert');
            }
            return result(state.finalFile);
          }
          if (query.operation === 'update') {
              if (query.payload.drive_copy_claimed_at && hasNull(query, 'drive_file_id')) {
              const staleBefore = lessThan(query, 'drive_copy_claimed_at');
              const claimIsStale = staleBefore && state.finalFile?.drive_copy_claimed_at && state.finalFile.drive_copy_claimed_at < staleBefore;
              const nullClaim = hasNull(query, 'drive_copy_claimed_at') && !state.finalFile?.drive_copy_claimed_at;
              if (!state.finalFile || state.finalFile.drive_file_id || (state.finalFile.drive_copy_claimed_at && !(nullClaim || claimIsStale))) return result(null);
              calls.driveClaims.push({ payload: query.payload, filters: query.filters });
              state.finalFile.drive_copy_claimed_at = query.payload.drive_copy_claimed_at;
              return result({ ...state.finalFile });
            }
            if (query.payload.drive_file_id && hasNull(query, 'drive_file_id')) {
              if (!state.finalFile || state.finalFile.drive_file_id) return result(null);
              Object.assign(state.finalFile, query.payload);
              return result({ ...state.finalFile });
            }
            if (query.payload.drive_copy_claimed_at === null) {
              if (state.finalFile && hasEq(query, 'drive_copy_claimed_at', state.finalFile.drive_copy_claimed_at)) state.finalFile.drive_copy_claimed_at = null;
              return result();
            }
            return result();
          }
        }
        if (query.table === 'consent_signatures') {
          state.signatureRecord = { ...query.payload };
          calls.signatureUpserts.push({ payload: state.signatureRecord, options: query.options });
          return result();
        }
        return result();
      };
      const from = vi.fn((table: string) => {
        calls.from.push(table);
        const query: any = {
          table, operation: 'select', columns: '*', filters: [], payload: null, options: null,
          select: vi.fn((columns: string) => { query.columns = columns; return query; }),
          eq: vi.fn((key: string, value: unknown) => { query.filters.push({ kind: 'eq', key, value }); return query; }),
          is: vi.fn((key: string, value: unknown) => { query.filters.push({ kind: 'is', key, value }); return query; }),
          in: vi.fn((key: string, values: unknown[]) => { query.filters.push({ kind: 'in', key, values }); return query; }),
          lt: vi.fn((key: string, value: unknown) => { query.filters.push({ kind: 'lt', key, value }); return query; }),
          update: vi.fn((payload: unknown) => { query.operation = 'update'; query.payload = payload; return query; }),
          insert: vi.fn((payload: unknown) => { query.operation = 'insert'; query.payload = payload; return query; }),
          upsert: vi.fn((payload: unknown, options: unknown) => { query.operation = 'upsert'; query.payload = payload; query.options = options; return query; }),
          single: vi.fn(() => execute(query)),
          maybeSingle: vi.fn(() => execute(query)),
        };
        query.then = (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) => execute(query).then(resolve, reject);
        return query;
      });
      const upload = vi.fn(async (_path: string, _bytes: Buffer, _options: unknown) => {
        calls.storageUploads += 1;
        calls.storageOptions.push(_options);
        if (options.failStorageUploadAfterWinner) {
          state.consent.status = 'signed';
          state.consent.final_file_id = 'winner-file';
          return { data: null, error: { message: 'synthetic-storage-failure' } };
        }
        if (state.objectCreated) return { data: null, error: { message: 'already exists' } };
        state.objectCreated = true;
        return { data: {}, error: null };
      });
      const download = vi.fn(async () => ({
        data: new Blob([Buffer.from('c3ludGhldGlj', 'base64')]),
        error: null,
      }));
      const client = { from, storage: { from: vi.fn(() => ({ upload, download })) } };
      mockedCreateServiceClient.mockReturnValue(client as never);
      return { client, state, calls, upload, download };
    }

    describe('unit 6 sanitary gate', () => {
      beforeEach(() => {
        vi.clearAllMocks();
        mockedGeneratePdf.mockResolvedValue({ base64: 'c3ludGhldGlj', blob: new Blob(), fileName: 'synthetic.pdf' });
      });

      it.each([
        ['incomplete', { health_registration_number: '', health_authorization_date: null, health_data_verified_at: null }],
        ['demo', { health_registration_number: 'SAN/07/2024-C', health_authorization_date: '2024-06-15', health_data_verified_at: '2026-07-28T10:00:00.000Z' }],
        ['unattested', { health_registration_number: 'SYNTHETIC-HEALTH', health_authorization_date: '2026-07-28', health_data_verified_at: null }],
      ])('blocks %s health data before every finalization side effect', async (_label, studio) => {
        const harness = blockedFinalizationClient({ id: 'studio-health', ...studio });
        const writeFile = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

        await expect(signConsentAsArtist('consent-health', 'signature-health', 'user-health')).rejects.toMatchObject({
          code: 'STUDIO_HEALTH_UNVERIFIED', status: 409, retryable: true, message: HEALTH_MESSAGE,
        });
        expect(harness.events).toEqual([]);
        expect(writeFile).not.toHaveBeenCalled();
        expect(mockedGeneratePdf).not.toHaveBeenCalled();
        expect(harness.upload).not.toHaveBeenCalled();
        expect(mockedUploadToDrive).not.toHaveBeenCalled();
        expect(harness.signatureUpsert).not.toHaveBeenCalled();
        expect(harness.client.from.mock.calls.filter(([table]) => table === 'consent_files')).toHaveLength(0);
        expect(harness.consentUpdates).toHaveLength(0);
        writeFile.mockRestore();
      });

      it('keeps the same pending consent visible and reloads current studio data on retry', async () => {
        const blocked = { health_registration_number: '', health_authorization_date: null, health_data_verified_at: null };
        const verified = { health_registration_number: 'SYNTHETIC-HEALTH', health_authorization_date: '2026-07-28', health_data_verified_at: '2026-07-28T10:00:00.000Z' };
        const harness = blockedFinalizationClient({ id: 'studio-health', ...blocked }, [{ id: 'studio-health', ...blocked }, { id: 'studio-health', ...verified }]);
        await expect(signConsentAsArtist('consent-health', 'signature-health', 'user-health')).rejects.toMatchObject({ code: 'STUDIO_HEALTH_UNVERIFIED' });
        mockedGeneratePdf.mockRejectedValueOnce(new Error('verified-current-studio'));
        await expect(signConsentAsArtist('consent-health', 'signature-health', 'user-health')).rejects.toThrow('verified-current-studio');
        expect(harness.studioReads).toEqual([
          { id: 'studio-health', ...blocked },
          { id: 'studio-health', ...verified },
        ]);
        expect(harness.consent).toMatchObject({ id: 'consent-health', status: 'pending_artist' });
            expect(harness.client.from.mock.calls.filter(([table]) => table === 'consents')).not.toContainEqual(['consents', 'insert']);
          });
        });

        describe('unit 6 finalization reconciliation', () => {
          beforeEach(() => {
            vi.clearAllMocks();
            mockedBuildPdfData.mockReturnValue({ templateVersion: 'synthetic-v6' } as never);
            mockedCreateSnapshot.mockReturnValue({ synthetic: true } as never);
            mockedGeneratePdf.mockResolvedValue({ base64: 'c3ludGhldGlj', blob: new Blob(), fileName: 'synthetic.pdf' });
            mockedUploadToDrive.mockResolvedValue({ driveFileId: 'drive-memory', driveViewLink: 'https://drive.invalid/memory' });
          });

          it('carries a complete synthetic minor and representative attribution through artist finalization', async () => {
            const state = syntheticMinorState();
            let insertedConsent: Record<string, unknown> | undefined;
            const consentInsert = vi.fn((payload: Record<string, unknown>) => {
              insertedConsent = payload;
              const chain = { select: vi.fn(), single: vi.fn().mockResolvedValue({ data: { id: 'consent-memory' }, error: null }) };
              chain.select.mockReturnValue(chain);
              return chain;
            });
            const publicSignatureUpsert = vi.fn().mockResolvedValue({ error: null });
            const consentTable = {
              select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), insert: consentInsert,
            };
            const submissionClient = { from: vi.fn((table: string) => table === 'consents' ? consentTable : { upsert: publicSignatureUpsert }) };
            const finalization = memoryFinalizationClient();
            mockedCreateServiceClient.mockReturnValueOnce(submissionClient as never);
            mockedResolvePublicStudio.mockResolvedValue({ id: 'studio-memory' } as never);
            mockedResolveArtist.mockResolvedValue({ id: 'artist-memory' } as never);
            const writeFile = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

            await expect(generateAndSubmitConsent(state, 'synthetic-minor-key')).resolves.toMatchObject({
              consentId: 'consent-memory', status: 'pending_technique',
            });
            const representativePersistence = {
              representative_full_name: 'SYNTHETIC REPRESENTATIVE', representative_dni: '12345678Z',
              representative_birth_date: '1980-02-03', representative_phone: '611111111',
              representative_address: 'SYNTHETIC STREET 2', representative_postal_code: '39002',
              representative_city: 'SYNTHETIC CITY', representative_relationship: 'SYNTHETIC RELATION',
              representative_accreditation: 'SYNTHETIC DOCUMENT',
            };
            expect(insertedConsent).toMatchObject({
              is_minor: true, has_legal_representative: true,
              client_birth_date: '2010-04-05', client_phone: '600000000',
              ...representativePersistence,
            });
            expect(publicSignatureUpsert).toHaveBeenCalledWith(expect.objectContaining({
              consent_id: 'consent-memory', studio_id: 'studio-memory', artist_id: 'artist-memory',
              signer_type: 'representative', signer_name: 'SYNTHETIC REPRESENTATIVE',
              signature_hash: createHash('sha256').update(state.firmaCliente).digest('hex'),
              metadata: { source: 'public_wizard' },
            }), { onConflict: 'consent_id,signer_type' });

            Object.assign(finalization.state.consent, insertedConsent, { status: 'pending_artist' });
            await expect(signConsentAsArtist('consent-memory', 'synthetic-artist-signature', 'user-memory'))
              .resolves.toMatchObject({ consentId: 'consent-memory', status: 'signed' });
            expect(mockedBuildPdfData).toHaveBeenCalledWith(expect.objectContaining({
              consent: expect.objectContaining(representativePersistence),
            }));
            expect(finalization.state.signatureRecord).toEqual({
              consent_id: 'consent-memory', studio_id: 'studio-memory', artist_id: 'artist-memory',
              signer_type: 'artist', signer_name: 'Artista Sintética',
              signature_hash: createHash('sha256').update('synthetic-artist-signature').digest('hex'),
              metadata: { source: 'artist_panel', storage_path: finalization.state.finalFile.storage_path },
            });
            expect(finalization.calls.signatureUpserts).toEqual([{
              payload: finalization.state.signatureRecord,
              options: { onConflict: 'consent_id,signer_type' },
            }]);
            expect(finalization.state.consent).toMatchObject({ status: 'signed', final_file_id: 'file-memory' });
            writeFile.mockRestore();
          });

          it.each(['fechaNacimiento', 'telefono'] as const)(
            'rejects a synthetic minor missing representative %s before persistence',
            async (field) => {
              const state = syntheticMinorState();
              state.datosRepresentante[field] = '';

              await expect(generateAndSubmitConsent(state, 'synthetic-invalid-key')).rejects.toMatchObject({
                code: 'REPRESENTATION_INVALID', stage: 'representation',
              });
              expect(mockedCreateServiceClient).not.toHaveBeenCalled();
            },
          );

          it('reuses one deterministic artifact across repeated calls and claims Drive once', async () => {
            const harness = memoryFinalizationClient();
            const writeFile = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
            const first = await signConsentAsArtist('consent-memory', 'signature-memory', 'user-memory', 'token-memory');
            const second = await signConsentAsArtist('consent-memory', 'signature-memory', 'user-memory', 'token-memory');

            expect(first).toMatchObject({ status: 'signed', consentId: 'consent-memory' });
            expect(second).toEqual(first);
            expect(harness.state.consent.status).toBe('signed');
            expect(harness.state.consent.final_file_id).toBe('file-memory');
            expect(harness.state.finalFile.sha256).toBe(harness.state.consent.finalization_content_sha256);
            expect(harness.calls.storageUploads).toBe(1);
            expect(harness.calls.storageOptions).toEqual([{ contentType: 'application/pdf', upsert: false }]);
            expect(harness.calls.fileInserts).toBe(1);
            expect(harness.calls.signedUpdates).toBe(1);
            expect(mockedGeneratePdf).toHaveBeenCalledTimes(1);
            expect(mockedUploadToDrive).toHaveBeenCalledTimes(1);
            expect(mockedUploadToDrive).toHaveBeenCalledWith(expect.objectContaining({
              consentId: 'consent-memory',
              pdfSha256: harness.state.finalFile.sha256,
              fileName: 'synthetic.pdf',
              pdfBase64: 'c3ludGhldGlj',
            }));
            expect(writeFile).toHaveBeenCalledTimes(1);
            writeFile.mockRestore();
          });

              it('recovers a stale Drive claim without replacing the final file', async () => {
                vi.useFakeTimers();
                vi.setSystemTime(new Date('2026-07-28T10:00:00.000Z'));
                const writeFile = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
                try {
                  const harness = memoryFinalizationClient();
                  await signConsentAsArtist('consent-memory', 'signature-memory', 'user-memory');
                  harness.state.consent.status = 'pending_artist';
                  harness.state.consent.final_file_id = null;
                  harness.state.finalFile.drive_copy_claimed_at = '2026-07-28T09:00:00.000Z';
                  harness.state.finalFile.drive_file_id = null;
                  const retry = await signConsentAsArtist('consent-memory', 'signature-memory', 'user-memory', 'token-memory');

                  expect(retry).toMatchObject({ status: 'signed', driveFileId: 'drive-memory' });
                  expect(harness.state.finalFile.drive_copy_claimed_at).not.toBe('2026-07-28T09:00:00.000Z');
                  expect(harness.calls.driveClaims).toHaveLength(1);
                  expect(harness.calls.driveClaims[0].filters).toContainEqual(expect.objectContaining({
                    kind: 'lt', key: 'drive_copy_claimed_at', value: expect.any(String),
                  }));
                  expect(mockedUploadToDrive).toHaveBeenCalledTimes(1);
                } finally {
                  writeFile.mockRestore();
                  vi.useRealTimers();
                }
              });

              it('does not overwrite a fresh Drive claim', async () => {
                vi.useFakeTimers();
                vi.setSystemTime(new Date('2026-07-28T10:00:00.000Z'));
                const writeFile = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
                try {
                  const harness = memoryFinalizationClient();
                  await signConsentAsArtist('consent-memory', 'signature-memory', 'user-memory');
                  harness.state.consent.status = 'pending_artist';
                  harness.state.consent.final_file_id = null;
                  harness.state.finalFile.drive_copy_claimed_at = '2026-07-28T09:59:00.000Z';
                  const retry = await signConsentAsArtist('consent-memory', 'signature-memory', 'user-memory', 'token-memory');

                  expect(retry).toMatchObject({ status: 'signed', driveFileId: null });
                  expect(harness.state.finalFile.drive_copy_claimed_at).toBe('2026-07-28T09:59:00.000Z');
                  expect(mockedUploadToDrive).not.toHaveBeenCalled();
                } finally {
                  writeFile.mockRestore();
                  vi.useRealTimers();
                }
              });

              it('establishes one winner for concurrent calls with the same content', async () => {
            const harness = memoryFinalizationClient();
            const writeFile = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
            const results = await Promise.all([
              signConsentAsArtist('consent-memory', 'signature-memory', 'user-memory', 'token-memory'),
              signConsentAsArtist('consent-memory', 'signature-memory', 'user-memory', 'token-memory'),
            ]);
            expect(results.every((result) => result.status === 'signed')).toBe(true);
            expect(harness.state.finalFile.id).toBe('file-memory');
            expect(harness.calls.signedUpdates).toBe(1);
            expect(mockedUploadToDrive).toHaveBeenCalledTimes(1);
            writeFile.mockRestore();
          });

          it('fails closed on a different content hash before Storage or file persistence', async () => {
            const harness = memoryFinalizationClient();
            harness.state.consent.finalization_content_sha256 = 'different-hash';
            const writeFile = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
            await expect(signConsentAsArtist('consent-memory', 'signature-memory', 'user-memory')).rejects.toMatchObject({
              code: 'FINALIZATION_CONTENT_CONFLICT', status: 409, retryable: false,
            });
            expect(harness.calls.storageUploads).toBe(0);
            expect(harness.calls.fileInserts).toBe(0);
            expect(harness.calls.signedUpdates).toBe(0);
            expect(writeFile).not.toHaveBeenCalled();
            writeFile.mockRestore();
          });

              it('does not regress a signed winner when a losing upload marks upload_error', async () => {
                const harness = memoryFinalizationClient({ failStorageUploadAfterWinner: true });
                const writeFile = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

                await expect(signConsentAsArtist('consent-memory', 'signature-memory', 'user-memory')).rejects.toMatchObject({
                  code: 'FINALIZATION_RETRYABLE',
                });
                expect(harness.state.consent.status).toBe('signed');
                expect(harness.calls.uploadErrorFilters).toHaveLength(1);
                expect(harness.calls.uploadErrorFilters[0]).toContainEqual({
                  kind: 'in', key: 'status', values: ['pending_artist', 'upload_error'],
                });
                writeFile.mockRestore();
              });

              it.each([
                ['object-created', { failFileInsertBefore: true }],
            ['file-inserted', { failFileInsertAfterPersist: true }],
          ])('reconciles a retry after a crash boundary: %s', async (_label, options) => {
            const harness = memoryFinalizationClient(options);
            const writeFile = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
            await expect(signConsentAsArtist('consent-memory', 'signature-memory', 'user-memory')).rejects.toBeDefined();
            await expect(signConsentAsArtist('consent-memory', 'signature-memory', 'user-memory')).resolves.toMatchObject({ status: 'signed' });
            expect(harness.state.consent.id).toBe('consent-memory');
            expect(harness.state.finalFile).toBeTruthy();
            expect(harness.state.consent.final_file_id).toBe('file-memory');
            expect(harness.calls.fileInserts).toBe('failFileInsertBefore' in options ? 2 : 1);
            writeFile.mockRestore();
          });

          it('reuses the claimed artist signature after a failed attempt and modal reset', async () => {
            const harness = memoryFinalizationClient({ failFileInsertBefore: true });
            const writeFile = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

            await expect(
              signConsentAsArtist('consent-memory', 'signature-original', 'user-memory'),
            ).rejects.toMatchObject({ code: 'FINALIZATION_RETRYABLE' });
            expect(harness.state.consent.legal_acceptance).toMatchObject({
              firmaAplicador: 'signature-original',
            });

            await expect(
              signConsentAsArtist('consent-memory', 'signature-redrawn', 'user-memory'),
            ).resolves.toMatchObject({ status: 'signed' });
            expect(mockedBuildPdfData).toHaveBeenNthCalledWith(
              2,
              expect.objectContaining({ artistSignature: 'signature-original' }),
            );
            expect(harness.state.signatureRecord.signature_hash).not.toBeNull();
            writeFile.mockRestore();
          });

          it('returns the established signed winner after a crash immediately after the signed update', async () => {
            const harness = memoryFinalizationClient({ failSignedUpdateAfterPersist: true });
            const writeFile = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
            await expect(signConsentAsArtist('consent-memory', 'signature-memory', 'user-memory', 'token-memory')).rejects.toThrow('synthetic-crash-after-signed-update');
            const retry = await signConsentAsArtist('consent-memory', 'signature-memory', 'user-memory', 'token-memory');
            expect(retry).toMatchObject({
              status: 'signed',
              storagePath: harness.state.finalFile.storage_path,
              driveFileId: 'drive-memory',
              driveViewLink: 'https://drive.invalid/memory',
            });
            expect(mockedGeneratePdf).toHaveBeenCalledTimes(1);
            expect(harness.calls.storageUploads).toBe(1);
            expect(harness.download).toHaveBeenCalledWith(harness.state.finalFile.storage_path);
            expect(mockedUploadToDrive).toHaveBeenCalledTimes(1);
            expect(mockedUploadToDrive).toHaveBeenCalledWith(expect.objectContaining({
              consentId: 'consent-memory',
              pdfSha256: harness.state.finalFile.sha256,
              pdfBase64: 'c3ludGhldGlj',
              fileName: 'synthetic.pdf',
            }));
            writeFile.mockRestore();
          });
        });
