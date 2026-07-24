import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./supabase.js', () => ({ createServiceClient: vi.fn() }));
vi.mock('./drive.js', () => ({ uploadToDrive: vi.fn() }));
vi.mock('../src/lib/pdf.js', () => ({ generateConsentPDF: vi.fn() }));
vi.mock('./consentPdfData.js', () => ({ buildConsentPdfData: vi.fn(), createDocumentSnapshot: vi.fn() }));

import { createServiceClient } from './supabase.js';
import { generateConsentPDF } from '../src/lib/pdf.js';
import { generateAndSubmitConsent, saveConsentTechnique, signConsentAsArtist } from './consents';
import type { WizardState } from '../src/types';

const mockedCreateServiceClient = vi.mocked(createServiceClient);
const mockedGeneratePdf = vi.mocked(generateConsentPDF);

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

describe('consent service validation with external dependencies mocked', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
