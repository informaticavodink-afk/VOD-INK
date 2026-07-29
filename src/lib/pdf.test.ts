import { describe, expect, it } from 'vitest';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseConsentPdfData, type ConsentPdfData } from '../domain/consents/consentPdfSchema';
import { generateConsentPDF } from './pdf';

const signature = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XwW8WQAAAABJRU5ErkJggg==';

function createDocument(): ConsentPdfData {
  return parseConsentPdfData({
    templateVersion: 'consent-v2', generatedAt: '2026-07-24T18:00:00.000Z',
    establecimiento: { nombreRazonSocial: 'ESTUDIO PARAMETRIZADO SL', nombreComercial: 'MARCA PARAMETRIZADA', domicilio: 'CALLE ESTUDIO 91', localidad: 'CIUDAD ESTUDIO', cp: '39091', cif: 'B87654321', telefono: '942919191', numRegistroSanidad: 'SAN-UNICO-91', fechaAutorizacion: '2024-09-01' },
    aplicador: { id: '11111111-1111-4111-8111-111111111111', nombreYApellidos: 'ARTISTA PARAMETRIZADA', titulacion: 'TITULACION UNICA', dni: '12345678Z' },
    cliente: { nombreYApellidos: 'CLIENTE PARAMETRIZADA', dni: '87654321X', fechaNacimiento: '1990-03-04', domicilio: 'CALLE CLIENTE 73', cp: '39073', localidad: 'CIUDAD CLIENTE', telefono: '600737373' },
    esMenor: false, representante: null,
    tecnica: { denominacionGenerica: 'TECNICA UNICA', localizacionAnatomica: 'ZONA UNICA', tintas: [{ nombre: 'TINTA UNICA', numRegistroAEMPS: 'AEMPS-UNICO', lote: 'LOTE-UNICO', caducidad: '2028-09-01' }], otrosMateriales: 'MATERIAL UNICO', duracion: 'DURACION UNICA', posibilidadesEliminacion: 'ELIMINACION UNICA', presupuesto: 'PRECIO UNICO 275' },
    salud: [], declaracionLeido: true, confirmadoPrecio: true,
    firmaCliente: signature, firmaAplicador: signature, lugar: 'LUGAR UNICO', fecha: '24/07/2026',
  });
}

const representative = {
  nombreYApellidos: 'REPRESENTANTE PARAMETRIZADA', dni: '11111111H', fechaNacimiento: '1970-01-01',
  domicilio: 'CALLE REPRESENTANTE 4', cp: '39004', localidad: 'CIUDAD REPRESENTANTE', telefono: '600444444',
  parentesco: 'MADRE', acreditaMediante: 'LIBRO DE FAMILIA',
};

function createV3Document(overrides: Record<string, unknown> = {}): ConsentPdfData {
  return parseConsentPdfData({
    ...createDocument(),
    templateVersion: 'consent-v3-representation',
    tieneRepresentanteLegal: false,
    ...overrides,
  });
}

async function extractText(base64: string) {
  const task = getDocument({ data: new Uint8Array(Buffer.from(base64, 'base64')), useSystemFonts: true });
  const pdf = await task.promise;
  const pages: string[] = [];
  for (let index = 1; index <= pdf.numPages; index += 1) {
    const content = await (await pdf.getPage(index)).getTextContent();
    pages.push(content.items.map((item) => 'str' in item ? item.str : '').join(' '));
  }
  return { text: pages.join(' '), pageCount: pdf.numPages };
}

describe('generateConsentPDF', () => {
  it('renders all three v3 representation states and visible representative fields', async () => {
    const documents = [
      createV3Document({ esMenor: true, tieneRepresentanteLegal: true, representante: representative }),
      createV3Document({ esMenor: false, tieneRepresentanteLegal: false, representante: null }),
      createV3Document({ esMenor: false, tieneRepresentanteLegal: true, representante: representative }),
    ];
    const extracted = await Promise.all(documents.map(async (document) => extractText((await generateConsentPDF(document)).base64)));

    expect(extracted[0].text).toContain('1970-01-01');
    expect(extracted[0].text).toContain('600444444');
    expect(extracted[1].text).not.toContain('REPRESENTANTE PARAMETRIZADA');
    expect(extracted[2].text).toContain('EL REPRESENTANTE LEGAL:');
    expect(extracted[2].text).toContain('REPRESENTANTE PARAMETRIZADA');
    expect(extracted[2].text).toContain('1970-01-01');
    expect(extracted[2].text).toContain('600444444');
    expect(extracted[2].text).not.toContain('EL CLIENTE:');
  });

  it('keeps long represented v3 output complete, multi-page, and deterministic', async () => {
    const document = createV3Document({
      esMenor: false,
      tieneRepresentanteLegal: true,
      representante: representative,
      tecnica: { ...createDocument().tecnica, otrosMateriales: `VALOR LARGO ${'seguro '.repeat(180)}FIN VALOR LARGO` },
    });
    const result = await generateConsentPDF(document);
    const repeatedResult = await generateConsentPDF(document);
    const { text, pageCount } = await extractText(result.base64);

    expect(repeatedResult.base64).toBe(result.base64);
    expect(text).toContain('FIN VALOR LARGO');
    expect(text).toContain('1970-01-01');
    expect(text).toContain('600444444');
    expect(pageCount).toBeGreaterThanOrEqual(2);
  });


  it('renderiza los datos canónicos sin placeholders y de forma determinista', async () => {
    const document = createDocument();
    const result = await generateConsentPDF(document);
    const repeatedResult = await generateConsentPDF(document);
    const { text } = await extractText(result.base64);

    expect(repeatedResult.base64).toBe(result.base64);
    expect(result.blob.type).toBe('application/pdf');
    expect(result.fileName).toMatch(/^Consentimiento_PARAMETRIZADA_/);

    for (const expected of ['ESTUDIO PARAMETRIZADO SL', 'MARCA PARAMETRIZADA', 'ARTISTA PARAMETRIZADA', 'CLIENTE PARAMETRIZADA', 'TECNICA UNICA', 'ZONA UNICA', 'TINTA UNICA', 'LOTE-UNICO', 'PRECIO UNICO 275', 'LUGAR UNICO']) {
      expect(text).toContain(expected);
    }
    expect(text).not.toMatch(/aquí iría|No asignado|Tatuador Ejemplo|\[CIF\]/i);
  });

  it('renderiza representante, salud, varias tintas y contenido largo sin truncarlo', async () => {
    const base = createDocument();
    const longMaterials = `MATERIAL LARGO ${'seguro '.repeat(80)}FIN MATERIAL LARGO`;
    const document = parseConsentPdfData({
      ...base,
      esMenor: true,
      representante: {
        nombreYApellidos: 'REPRESENTANTE PARAMETRIZADA', dni: '11111111H', fechaNacimiento: '1970-01-01',
        domicilio: 'CALLE REPRESENTANTE 4', cp: '39004', localidad: 'CIUDAD REPRESENTANTE', telefono: '600444444',
        parentesco: 'MADRE', acreditaMediante: 'LIBRO DE FAMILIA',
      },
      salud: ['Diabetes mellitus no controlada o que curse con problemas circulatorios o de cicatrización.'],
      tecnica: {
        ...base.tecnica,
        otrosMateriales: longMaterials,
        tintas: [
          ...base.tecnica.tintas,
          { nombre: 'SEGUNDA TINTA', numRegistroAEMPS: 'AEMPS-2', lote: 'LOTE-2', caducidad: '2029-01-01' },
        ],
      },
    });

    const { base64 } = await generateConsentPDF(document);
    const { text, pageCount } = await extractText(base64);

    expect(text).toContain('REPRESENTANTE PARAMETRIZADA');
    expect(text).toContain('SEGUNDA TINTA');
    expect(text).toContain('FIN MATERIAL LARGO');
    expect(text).toContain('[ X ]');
    expect(pageCount).toBeGreaterThanOrEqual(2);
  });

  it('usa un nombre seguro para clientes con un solo nombre', async () => {
    const document = createDocument();
    document.cliente.nombreYApellidos = 'MONONIMO';
    const result = await generateConsentPDF(document);
    expect(result.fileName).toMatch(/^Consentimiento_CLIENTE_/);
  });

  it('falla si una firma se corrompe después de validar el contrato', async () => {
    const document = createDocument();
    document.firmaAplicador = 'data:image/png;base64,iVBORw0KGgoINVALIDA';
    await expect(generateConsentPDF(document)).rejects.toThrow(/incorporar el aplicador/i);
  });
});
