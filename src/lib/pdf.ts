/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { LEGAL_SECTIONS } from './legalTexts.js';
import { CONSENT_PDF_TEMPLATE_VERSION, hasLegalRepresentation, type ConsentPdfData } from '../domain/consents/consentPdfSchema.js';

function base64ToUint8Array(base64: string): Uint8Array {
  const rawBase64 = base64.startsWith('data:') ? base64.split(',')[1] : base64;
  const binaryString = atob(rawBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function generateConsentPDF(document: ConsentPdfData): Promise<{ base64: string; blob: Blob; fileName: string }> {
  const representation = hasLegalRepresentation(document);
  const state = {
    artistaSeleccionado: document.aplicador,
    datosCliente: document.cliente,
    esMenor: document.esMenor,
    tieneRepresentanteLegal: representation,
    datosRepresentante: document.representante ?? {
      nombreYApellidos: '', dni: '', fechaNacimiento: '', domicilio: '', cp: '', localidad: '', telefono: '', parentesco: '', acreditaMediante: '',
    },
    datosTecnica: document.tecnica,
    declaracionSaludSeleccionadas: document.salud,
    confirmadoPrecio: document.confirmadoPrecio,
    firmaCliente: document.firmaCliente,
    firmaAplicador: document.firmaAplicador,
    lugar: document.lugar,
    fecha: document.fecha,
  };
  const pdfDoc = await PDFDocument.create();
  const generatedAt = new Date(document.generatedAt);
  pdfDoc.setCreationDate(generatedAt);
  pdfDoc.setModificationDate(generatedAt);
  pdfDoc.setProducer('VOD INK Consent Service');
  pdfDoc.setCreator('VOD INK Consent Service');
  pdfDoc.setTitle(`Consentimiento ${document.cliente.nombreYApellidos}`);

  // Use standard Helvetica and Helvetica-Bold fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const PAGE_WIDTH = 595.28; // A4 Width
  const PAGE_HEIGHT = 841.89; // A4 Height
  const MARGIN = 35;

  // Helper to draw clean borders
  const drawPageBorder = (pageObj: any) => {
    pageObj.drawRectangle({
      x: 18,
      y: 18,
      width: PAGE_WIDTH - 36,
      height: PAGE_HEIGHT - 36,
      borderColor: rgb(0.15, 0.15, 0.15),
      borderWidth: 0.8,
      color: rgb(1, 1, 1),
      opacity: 0,
    });
  };

  // Helper to add a centered, italic footer to pages
  const drawPageFooter = (pageObj: any, pageNum: number, totalPages: number) => {
    const footerText = `${document.establecimiento.nombreComercial}  |  Documento de Consentimiento Informado  |  Página ${pageNum} de ${totalPages}`;
    const fontSize = 6.5;
    const textWidth = fontOblique.widthOfTextAtSize(footerText, fontSize);
    const x = (PAGE_WIDTH - textWidth) / 2;

    pageObj.drawText(footerText, {
      x,
      y: 25,
      size: fontSize,
      font: fontOblique,
      color: rgb(0.4, 0.4, 0.4),
    });
  };

  // Proportional font word-wrapping helper
  const wrapText = (text: string, font: any, size: number, maxWidth: number): string[] => {
    const paragraphs = text.split('\n');
    const lines: string[] = [];
    
    for (const paragraph of paragraphs) {
      const words = paragraph.split(/\s+/);
      let currentLine = '';
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, size);
        if (testWidth > maxWidth) {
          if (currentLine) {
            lines.push(currentLine);
          }
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }
    }
    return lines;
  };

  // Define our Block interface
  interface Block {
    id: string;
    height: number;
    draw: (page: any, y: number) => Promise<void> | void;
  }

  const blocks: Block[] = [];

  // 1. Header Block (Page 1 Header)
  blocks.push({
    id: 'header',
    height: 52,
    draw: (page, y) => {
      page.drawRectangle({
        x: MARGIN,
        y: y - 50,
        width: PAGE_WIDTH - MARGIN * 2,
        height: 50,
        color: rgb(0.05, 0.05, 0.05),
      });

      page.drawText(document.establecimiento.nombreComercial, {
        x: MARGIN + 15,
        y: y - 22,
        size: 15,
        font: fontBold,
        color: rgb(1, 1, 1),
      });

      page.drawText('CONSENTIMIENTO INFORMADO', {
        x: MARGIN + 15,
        y: y - 38,
        size: 7,
        font: fontRegular,
        color: rgb(0.9, 0.9, 0.9),
      });
    }
  });

  // 2. Section A (Datos del Establecimiento)
  blocks.push({
    id: 'section_a',
    height: 48,
    draw: (page, y) => {
      let tempY = y;
      page.drawText('A. DATOS DEL ESTABLECIMIENTO', {
        x: MARGIN,
        y: tempY - 8.5,
        size: 8.5,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      tempY -= 12.5;

      const registration = document.templateVersion === CONSENT_PDF_TEMPLATE_VERSION
        ? document.establecimiento.numRegistroSanidad
        : `${document.establecimiento.numRegistroSanidad} (${document.establecimiento.fechaAutorizacion})`;
      const establishmentFields = [
        `Razón Social: ${document.establecimiento.nombreRazonSocial}  |  CIF: ${document.establecimiento.cif}`,
        `Domicilio: ${document.establecimiento.domicilio}, ${document.establecimiento.localidad} (${document.establecimiento.cp})`,
        `Tlf: ${document.establecimiento.telefono}  |  Reg. Sanitario: ${registration}`,
      ];

      for (const line of establishmentFields) {
        page.drawText(line, { x: MARGIN + 10, y: tempY - 7.5, size: 7.5, font: fontRegular });
        tempY -= 11;
      }
    }
  });

  // 3. Section B (Datos del Técnico)
  blocks.push({
    id: 'section_b',
    height: 37,
    draw: (page, y) => {
      let tempY = y;
      page.drawText('B. DATOS DEL TÉCNICO APLICADOR ASIGNADO', {
        x: MARGIN,
        y: tempY - 8.5,
        size: 8.5,
        font: fontBold,
      });
      tempY -= 12.5;

      const appFields = [
        `Nombre y Apellidos: ${state.artistaSeleccionado.nombreYApellidos}`,
        `DNI/NIE: ${state.artistaSeleccionado.dni}  |  Cualificación: ${state.artistaSeleccionado.titulacion}`,
      ];

      for (const line of appFields) {
        page.drawText(line, { x: MARGIN + 10, y: tempY - 7.5, size: 7.5, font: fontRegular });
        tempY -= 11;
      }
    }
  });

  // 4. Section C (Filiación)
  let sectionCHeight = 48;
  if (state.tieneRepresentanteLegal) {
    sectionCHeight += 53;
  }
  blocks.push({
    id: 'section_c',
    height: sectionCHeight,
    draw: (page, y) => {
      let tempY = y;
      page.drawText('C. FILIACIÓN DE LA PERSONA USUARIA (Y REPRESENTANTE LEGAL)', {
        x: MARGIN,
        y: tempY - 8.5,
        size: 8.5,
        font: fontBold,
      });
      tempY -= 12.5;

      const clientFields = [
        `Nombre y Apellidos: ${state.datosCliente.nombreYApellidos.toUpperCase()}`,
        `DNI / NIE / Pasaporte: ${state.datosCliente.dni.toUpperCase()}  |  F. Nacimiento: ${state.datosCliente.fechaNacimiento}`,
        `Domicilio: ${state.datosCliente.domicilio}, ${state.datosCliente.localidad} (${state.datosCliente.cp})  |  Tlf: ${state.datosCliente.telefono}`,
      ];

      for (const line of clientFields) {
        page.drawText(line, { x: MARGIN + 10, y: tempY - 7.5, size: 7.5, font: fontRegular });
        tempY -= 11;
      }

      if (state.tieneRepresentanteLegal) {
        tempY -= 4;
        page.drawText('REPRESENTACIÓN LEGAL ACREDITADA:', {
          x: MARGIN + 10,
          y: tempY - 7.5,
          size: 7.5,
          font: fontBold,
        });
        tempY -= 11;

        const repFields = [
          `Representante: ${state.datosRepresentante.nombreYApellidos.toUpperCase()}  |  DNI/NIE: ${state.datosRepresentante.dni.toUpperCase()}`,
          `F. Nacimiento: ${state.datosRepresentante.fechaNacimiento}  |  Tlf: ${state.datosRepresentante.telefono}`,
          `Domicilio: ${state.datosRepresentante.domicilio}, ${state.datosRepresentante.localidad} (${state.datosRepresentante.cp})`,
          `Parentesco/Tutela: ${state.datosRepresentante.parentesco}  |  Acreditación: ${state.datosRepresentante.acreditaMediante.replace(/_/g, ' ')}`,
        ];

        for (const line of repFields) {
          page.drawText(line, { x: MARGIN + 20, y: tempY - 7, size: 7, font: fontRegular });
          tempY -= 10;
        }
      }
    }
  });

  // 5. Section D, E, K (Especificaciones Técnicas + Tintas)
  const technicalLines = [
    `Técnica: ${state.datosTecnica.denominacionGenerica.toUpperCase()}  |  Zona anatómica: ${state.datosTecnica.localizacionAnatomica.toUpperCase()}`,
    `Duración aprox: ${state.datosTecnica.duracion}  |  Presupuesto sesión: ${state.datosTecnica.presupuesto}`,
    `Posibilidad desvinculación/eliminación: ${state.datosTecnica.posibilidadesEliminacion}`,
    `Materiales auxiliares y de barrera: ${state.datosTecnica.otrosMateriales}`,
  ].flatMap((line) => wrapText(line, fontRegular, 7, PAGE_WIDTH - MARGIN * 2 - 20));
  const inkLines = state.datosTecnica.tintas.map((tinta, idx) =>
    wrapText(
      `Tinta #${idx + 1}: ${tinta.nombre}  |  Reg. AEMPS: ${tinta.numRegistroAEMPS}  |  Lote: ${tinta.lote}  |  Caducidad: ${tinta.caducidad}`,
      fontRegular,
      6.5,
      PAGE_WIDTH - MARGIN * 2 - 30,
    )
  );
  const sectionDHeight = 30 + technicalLines.length * 10.5 + 14 + inkLines.reduce((total, lines) => total + lines.length * 9.5, 0);

  blocks.push({
    id: 'section_d_e_k',
    height: sectionDHeight,
    draw: (page, y) => {
      let tempY = y;
      page.drawText('D, E, K. ESPECIFICACIONES TÉCNICAS DEL TRATAMIENTO', {
        x: MARGIN,
        y: tempY - 8.5,
        size: 8.5,
        font: fontBold,
      });
      tempY -= 12.5;

      for (const line of technicalLines) {
        page.drawText(line, { x: MARGIN + 10, y: tempY - 7, size: 7, font: fontRegular });
        tempY -= 10.5;
      }

      tempY -= 3;
      page.drawText('TINTAS / PIGMENTOS DE IMPLANTACIÓN REGISTRADOS:', { x: MARGIN + 10, y: tempY - 7, size: 7, font: fontBold });
      tempY -= 10.5;

      for (const lines of inkLines) {
        for (const line of lines) {
          page.drawText(line, { x: MARGIN + 20, y: tempY - 6.5, size: 6.5, font: fontRegular });
          tempY -= 9.5;
        }
      }
    }
  });

  // Helper to create wrapped text blocks
  const createWrappedTextBlock = (id: string, title: string, contents: string[], fontSize = 6.2, lineHeight = 8.0): Block => {
    const maxWidth = PAGE_WIDTH - MARGIN * 2 - 10;
    
    // Pre-calculate wrapped lines for exact height calculation
    const paragraphsWithLines: string[][] = [];
    let totalLinesCount = 0;
    for (const paragraph of contents) {
      const wrapped = wrapText(paragraph, fontRegular, fontSize, maxWidth);
      paragraphsWithLines.push(wrapped);
      totalLinesCount += wrapped.length;
    }
    
    const blockHeight = 10 + 3 + totalLinesCount * lineHeight + contents.length * 2;
    
    return {
      id,
      height: blockHeight,
      draw: (page, y) => {
        let tempY = y;
        page.drawText(title, { x: MARGIN, y: tempY - 7.5, size: 7.5, font: fontBold });
        tempY -= 10;
        
        for (const paragraphLines of paragraphsWithLines) {
          for (const line of paragraphLines) {
            page.drawText(line, {
              x: MARGIN + 10,
              y: tempY - fontSize,
              size: fontSize,
              font: fontRegular,
              color: rgb(0.2, 0.2, 0.2),
            });
            tempY -= lineHeight;
          }
          tempY -= 2; // spacing between paragraphs
        }
      }
    };
  };

  // Add long text sections F, G, H, I
  blocks.push(createWrappedTextBlock('section_f', LEGAL_SECTIONS.seccionF.titulo, LEGAL_SECTIONS.seccionF.contenido));
  blocks.push(createWrappedTextBlock('section_g', LEGAL_SECTIONS.seccionG.titulo, LEGAL_SECTIONS.seccionG.contenido));
  blocks.push(createWrappedTextBlock('section_h', LEGAL_SECTIONS.seccionH.titulo, LEGAL_SECTIONS.seccionH.contenido));
  blocks.push(createWrappedTextBlock('section_i', LEGAL_SECTIONS.seccionI.titulo, LEGAL_SECTIONS.seccionI.contenido));

  // Add Section J (Contraindications in Columns)
  const createSectionJBlock = (): Block => {
    const colWidth = (PAGE_WIDTH - MARGIN * 2 - 20) / 2;
    const maxTextWidth = colWidth - 20;

    const wrapAndMeasureList = (items: string[]) => {
      let height = 8 + 8; // title (8) + spacing (8)
      const itemsLines: string[][] = [];
      for (const item of items) {
        const wrapped = wrapText(item, fontRegular, 5.8, maxTextWidth);
        itemsLines.push(wrapped);
        height += wrapped.length * 7.0;
      }
      return { height, itemsLines };
    };

    const j1Data = wrapAndMeasureList(LEGAL_SECTIONS.seccionJ.listaTemporal);
    const j3Data = wrapAndMeasureList(LEGAL_SECTIONS.seccionJ.listaDefinitiva);
    const j2Data = wrapAndMeasureList(LEGAL_SECTIONS.seccionJ.listaMedica);

    const leftColumnHeight = j1Data.height + 8 + j3Data.height;
    const rightColumnHeight = j2Data.height;
    
    const columnsHeight = Math.max(leftColumnHeight, rightColumnHeight);
    const totalHeight = 10 + 10 + columnsHeight;

    return {
      id: 'section_j',
      height: totalHeight,
      draw: (page, y) => {
        let tempY = y;
        page.drawText(LEGAL_SECTIONS.seccionJ.titulo, { x: MARGIN, y: tempY - 7.8, size: 7.8, font: fontBold });
        tempY -= 10;
        
        const colYStart = tempY;
        
        const drawPreMeasuredList = (x: number, startY: number, listTitle: string, items: string[], preMeasuredLines: string[][]) => {
          let localY = startY;
          page.drawText(listTitle, { x: x, y: localY - 6.8, size: 6.8, font: fontBold });
          localY -= 8;
          
          for (let idx = 0; idx < items.length; idx++) {
            const item = items[idx];
            const lines = preMeasuredLines[idx];
            const isMarked = state.declaracionSaludSeleccionadas.includes(item);
            const markSymbol = isMarked ? '[ X ] ' : '[   ] ';
            
            for (let i = 0; i < lines.length; i++) {
              const prefix = i === 0 ? markSymbol : '      ';
              page.drawText(`${prefix}${lines[i]}`, {
                x: x + 3,
                y: localY - 5.8,
                size: 5.8,
                font: isMarked ? fontBold : fontRegular,
                color: isMarked ? rgb(0, 0, 0) : rgb(0.3, 0.3, 0.3),
              });
              localY -= 7.0;
            }
          }
          return localY;
        };

        let leftY = drawPreMeasuredList(MARGIN, colYStart, 'J.1 CONTRAINDICACIONES TEMPORALES:', LEGAL_SECTIONS.seccionJ.listaTemporal, j1Data.itemsLines);
        leftY -= 8;
        drawPreMeasuredList(MARGIN, leftY, 'J.3 CONTRAINDICACIONES DEFINITIVAS:', LEGAL_SECTIONS.seccionJ.listaDefinitiva, j3Data.itemsLines);

        drawPreMeasuredList(PAGE_WIDTH / 2 + 10, colYStart, 'J.2 BAJO SUPERVISIÓN MÉDICA:', LEGAL_SECTIONS.seccionJ.listaMedica, j2Data.itemsLines);
      }
    };
  };

  blocks.push(createSectionJBlock());

  // Add Conformity & Privacy Block
  const createConformityBlock = (): Block => {
    const maxWidth = PAGE_WIDTH - MARGIN * 2 - 10;
    const fontSize = 5.8;
    const lineHeight = 7.2;

    const linesConf = wrapText(LEGAL_SECTIONS.conformidad.texto, fontRegular, fontSize, maxWidth);
    const linesPriv = wrapText(LEGAL_SECTIONS.privacidad.texto, fontRegular, fontSize, maxWidth);

    const totalHeight = 10 + 10 + linesConf.length * lineHeight + 3 + linesPriv.length * lineHeight + 6;

    return {
      id: 'conformity_privacy',
      height: totalHeight,
      draw: (page, y) => {
        let tempY = y;
        page.drawText('DECLARACIÓN EXPRESA DE VOLUNTAD Y RGPD', { x: MARGIN, y: tempY - 7.8, size: 7.8, font: fontBold });
        tempY -= 10;

        for (const line of linesConf) {
          page.drawText(line, {
            x: MARGIN + 5,
            y: tempY - fontSize,
            size: fontSize,
            font: fontRegular,
            color: rgb(0.15, 0.15, 0.15),
          });
          tempY -= lineHeight;
        }
        tempY -= 3;

        for (const line of linesPriv) {
          page.drawText(line, {
            x: MARGIN + 5,
            y: tempY - fontSize,
            size: fontSize,
            font: fontRegular,
            color: rgb(0.15, 0.15, 0.15),
          });
          tempY -= lineHeight;
        }
      }
    };
  };

  blocks.push(createConformityBlock());

  // Helper to draw signature boxes
  const drawSignatureBox = async (
    page: any,
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    name: string,
    signatureBase64: string,
    dni?: string
  ) => {
    page.drawRectangle({
      x,
      y: y - height,
      width,
      height,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 0.8,
    });

    page.drawText(title, {
      x: x + 5,
      y: y + 4,
      size: 7.0,
      font: fontBold,
    });

    // Signature inside the box (full area, name/DNI go below)
    if (signatureBase64) {
      try {
        const sigBytes = base64ToUint8Array(signatureBase64);
        const sigImage = await pdfDoc.embedPng(sigBytes);
        page.drawImage(sigImage, {
          x: x + 10,
          y: y - height + 6,
          width: width - 20,
          height: height - 12,
        });
      } catch {
        throw new Error(`No se pudo incorporar ${title.toLowerCase()} al PDF final`);
      }
    }

    // Name and DNI clearly readable below the box
    const infoY = y - height - 10;
    page.drawText(name.substring(0, 48).toUpperCase(), {
      x: x + 2,
      y: infoY,
      size: 7.0,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    });

    page.drawText(`DNI/NIE: ${dni ? dni.toUpperCase() : '____________________'}`, {
      x: x + 2,
      y: infoY - 10,
      size: 6.5,
      font: fontRegular,
      color: rgb(0.25, 0.25, 0.25),
    });
  };

  // Add Signatures & Location Block
  const createSignaturesBlock = (): Block => {
    const boxHeight = 60;
    // Two boxes spanning the full content width with a central gap
    const boxWidth = (PAGE_WIDTH - MARGIN * 2 - 25) / 2; // ~250pt each

    let blockHeight = 120;
    if (state.tieneRepresentanteLegal && state.esMenor) {
      blockHeight = 290;
    }

    return {
      id: 'signatures',
      height: blockHeight,
      draw: async (page, y) => {
        let tempY = y;
        const dateStr = state.fecha;
        const placeStr = state.lugar;
        const nombreTattoo = state.artistaSeleccionado.nombreYApellidos;
        const nombreCliente = state.datosCliente.nombreYApellidos;

        // --- ROW 1: General Consent ---
        page.drawText(`En ${placeStr.toUpperCase()}, a ${dateStr}`, {
          x: MARGIN,
          y: tempY - 7.5,
          size: 7.5,
          font: fontBold,
        });
        tempY -= 28;

        // Draw Left: APLICADOR
        await drawSignatureBox(
          page,
          MARGIN,
          tempY,
          boxWidth,
          boxHeight,
          'EL APLICADOR:',
          nombreTattoo,
          state.firmaAplicador,
          state.artistaSeleccionado.dni
        );

        // Draw the consenting party; represented adults use the representative as sole signer.
        const representedAdult = state.tieneRepresentanteLegal && !state.esMenor;
        await drawSignatureBox(
          page,
          PAGE_WIDTH - MARGIN - boxWidth,
          tempY,
          boxWidth,
          boxHeight,
          representedAdult ? 'EL REPRESENTANTE LEGAL:' : 'EL CLIENTE:',
          representedAdult ? state.datosRepresentante.nombreYApellidos : nombreCliente,
          state.esMenor ? '' : state.firmaCliente,
          representedAdult ? state.datosRepresentante.dni : state.datosCliente.dni
        );

        // --- ROW 2: Minor representation (if applicable) ---
        if (state.tieneRepresentanteLegal && state.esMenor) {
          tempY -= (boxHeight + 32); // extra room for name + DNI below the boxes

          // Section Title
          page.drawText('ACREDITACIÓN DEL GRADO DE MADUREZ PARA EL SUPUESTO DE MENOR DE EDAD O INCAPACITADO:', {
            x: MARGIN,
            y: tempY - 7.0,
            size: 6.5,
            font: fontBold,
            color: rgb(0.15, 0.15, 0.15),
          });
          tempY -= 9;

          // Declaration text
          const repText = `Yo, ${state.datosRepresentante.nombreYApellidos.toUpperCase()} con DNI ${state.datosRepresentante.dni.toUpperCase()} como ${state.datosRepresentante.parentesco.toUpperCase()} de ${nombreCliente.toUpperCase()}, cuyo grado de parentesco o responsabilidad acredito mediante ${state.datosRepresentante.acreditaMediante.replace(/_/g, ' ').toUpperCase()}, considero que mi tutelado/a tiene la madurez mental suficiente para someterse a la prueba de arte corporal especificada en este documento. Y, como prueba de este reconocimiento firmo la presente, en presencia del aplicador.`;

          const wrappedRepText = wrapText(repText, fontRegular, 5.5, PAGE_WIDTH - MARGIN * 2);
          for (const line of wrappedRepText) {
            page.drawText(line, {
              x: MARGIN,
              y: tempY - 5.5,
              size: 5.5,
              font: fontRegular,
              color: rgb(0.3, 0.3, 0.3),
            });
            tempY -= 7;
          }
          tempY -= 4;

          page.drawText(`En ${placeStr.toUpperCase()}, a ${dateStr}`, {
            x: MARGIN,
            y: tempY - 7.5,
            size: 7.5,
            font: fontBold,
          });
          tempY -= 28;

          // Draw Left: APLICADOR (Row 2)
          await drawSignatureBox(
            page,
            MARGIN,
            tempY,
            boxWidth,
            boxHeight,
            'EL APLICADOR:',
            nombreTattoo,
            state.firmaAplicador,
            state.artistaSeleccionado.dni
          );

          // Draw Right: EL REPRESENTANTE LEGAL
          await drawSignatureBox(
            page,
            PAGE_WIDTH - MARGIN - boxWidth,
            tempY,
            boxWidth,
            boxHeight,
            'EL REPRESENTANTE LEGAL:',
            state.datosRepresentante.nombreYApellidos,
            state.firmaCliente,
            state.datosRepresentante.dni
          );
        }
      }
    };
  };

  blocks.push(createSignaturesBlock());
  const maxY = PAGE_HEIGHT - MARGIN * 2 - 20; // Maximum content height per page (~751 pt)
  const pages: Block[][] = [[]];
  let currentPageHeight = 0;

  for (const block of blocks) {
    const padding = currentPageHeight > 0 ? 10 : 0;
    const requiredSpace = block.height + padding;

    if (currentPageHeight + requiredSpace > maxY) {
      pages.push([block]);
      currentPageHeight = block.height;
    } else {
      pages[pages.length - 1].push(block);
      currentPageHeight += requiredSpace;
    }
  }

  // Prevent orphan signatures: If the last page contains ONLY the 'signatures' block,
  // pull the 'conformity_privacy' block (and potentially preceding blocks) from the previous page
  // to ensure signatures are never orphaned.
  if (pages.length > 1) {
    const lastPageIndex = pages.length - 1;
    const lastPage = pages[lastPageIndex];
    if (lastPage.length === 1 && lastPage[0].id === 'signatures') {
      const prevPage = pages[lastPageIndex - 1];
      if (prevPage.length > 1) {
        const pulledBlock = prevPage.pop()!;
        lastPage.unshift(pulledBlock);
      }
    }
  }

  // Draw the partitioned pages
  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    const pageBlocks = pages[pageIdx];
    const pageObj = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawPageBorder(pageObj);
    
    let y = PAGE_HEIGHT - MARGIN - 15;
    
    for (let blockIdx = 0; blockIdx < pageBlocks.length; blockIdx++) {
      const block = pageBlocks[blockIdx];
      await block.draw(pageObj, y);
      y -= block.height + 10;
    }
  }

  // Draw footer on all pages with correct page numbering
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const pageObj = pdfDoc.getPage(i);
    drawPageFooter(pageObj, i + 1, totalPages);
  }

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });

  let base64 = '';
  if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(pdfBytes).toString('base64');
  } else {
    let binary = '';
    const len = pdfBytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(pdfBytes[i]);
    }
    base64 = btoa(binary);
  }

  const cleanSurname = state.datosCliente.nombreYApellidos
    .trim()
    .split(' ')
    .filter((_, idx) => idx > 0)
    .join('_') || 'cliente';

  const cleanSurnameSanitized = cleanSurname
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .toUpperCase();

  const formattedDate = new Date().toISOString().slice(0, 10);
  const formattedTime = new Date().toTimeString().slice(0, 5).replace(':', '');
  const fileName = `Consentimiento_${cleanSurnameSanitized}_${formattedDate}_${formattedTime}.pdf`;

  return { base64, blob, fileName };
}
