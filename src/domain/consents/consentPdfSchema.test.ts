import { describe, expect, it } from 'vitest';
import { parseConsentPdfData } from './consentPdfSchema';

const signature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XwW8WQAAAABJRU5ErkJggg==';

function validDocument() {
  return {
    templateVersion: 'consent-v2', generatedAt: '2026-07-24T18:00:00.000Z',
    establecimiento: { nombreRazonSocial: 'VOD INK S.L.', nombreComercial: 'VOD INK', domicilio: 'Calle Real 1', localidad: 'Santander', cp: '39001', cif: 'B12345678', telefono: '942000000', numRegistroSanidad: 'REG-123', fechaAutorizacion: '2024-01-02' },
    aplicador: { id: '11111111-1111-4111-8111-111111111111', nombreYApellidos: 'Ana Artista Real', titulacion: 'Técnica higiénico-sanitaria', dni: '12345678Z' },
    cliente: { nombreYApellidos: 'Clara Cliente Prueba', dni: '87654321X', fechaNacimiento: '1990-03-04', domicilio: 'Avenida Cliente 5', cp: '39002', localidad: 'Santander', telefono: '600111222' },
    esMenor: false, representante: null,
    tecnica: { denominacionGenerica: 'Tatuaje artístico', localizacionAnatomica: 'Gemelo derecho', tintas: [{ nombre: 'Negro certificado', numRegistroAEMPS: 'AEMPS-77', lote: 'LOTE-UNICO-9', caducidad: '2028-09-01' }], otrosMateriales: 'Aguja lote AG-2', duracion: 'Dos horas', posibilidadesEliminacion: 'Láser', presupuesto: '275 EUR' },
    salud: ['Alergia declarada y revisada'], declaracionLeido: true as const, confirmadoPrecio: true,
    firmaCliente: signature, firmaAplicador: signature, lugar: 'Santander', fecha: '24/07/2026',
  };
}

describe('ConsentPdfDataSchema', () => {
  it('acepta un documento completamente parametrizado', () => {
    expect(parseConsentPdfData(validDocument()).tecnica.presupuesto).toBe('275 EUR');
  });

  it.each(['N/A', 'No asignado', 'aquí iría tus datos', '[CIF]', 'Tatuador Ejemplo 1'])('rechaza el placeholder %s', (placeholder) => {
    const document = validDocument();
    document.aplicador.nombreYApellidos = placeholder;
    expect(() => parseConsentPdfData(document)).toThrow();
  });

  it('exige representante cuando el cliente es menor', () => {
    const document = validDocument();
    document.esMenor = true;
    expect(() => parseConsentPdfData(document)).toThrow(/representante legal/i);
  });

  it('rechaza representante en un consentimiento adulto', () => {
    const document = validDocument();
    document.representante = {
      nombreYApellidos: 'Representante Inesperada', dni: '11111111H', fechaNacimiento: '1970-01-01',
      domicilio: 'Calle Tutor 1', cp: '39001', localidad: 'Santander', telefono: '600000003',
      parentesco: 'MADRE', acreditaMediante: 'LIBRO DE FAMILIA',
    };
    expect(() => parseConsentPdfData(document)).toThrow(/No debe incluirse representante/i);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['objeto vacío', {}],
  ])('rechaza como entrada %s', (_label, input) => {
    expect(() => parseConsentPdfData(input)).toThrow();
  });

  it('acepta arrays de salud vacíos y valores largos sin truncarlos', () => {
    const document = validDocument();
    const longValue = `Material ${'X'.repeat(2_000)}`;
    document.salud = [];
    document.tecnica.otrosMateriales = longValue;
    expect(parseConsentPdfData(document).tecnica.otrosMateriales).toBe(longValue);
  });

  it('rechaza arrays de tintas vacíos', () => {
    const document = validDocument();
    document.tecnica.tintas = [];
    expect(() => parseConsentPdfData(document)).toThrow(/al menos una tinta/i);
  });

  it('rechaza firmas ausentes o con formato incorrecto', () => {
    const document = validDocument();
    document.firmaAplicador = undefined as unknown as string;
    expect(() => parseConsentPdfData(document)).toThrow(/firma/i);

    document.firmaAplicador = 'data:image/jpeg;base64,AA==';
    expect(() => parseConsentPdfData(document)).toThrow(/PNG/i);
  });

  it('rechaza propiedades inesperadas en objetos estrictos', () => {
    const document = validDocument() as ReturnType<typeof validDocument> & { fixture?: string };
    document.fixture = 'no permitido';
    expect(() => parseConsentPdfData(document)).toThrow();
  });

  it('rechaza técnica o tintas incompletas', () => {
    const document = validDocument();
    document.tecnica.tintas[0].lote = '';
    expect(() => parseConsentPdfData(document)).toThrow(/Lote/i);
  });
});
