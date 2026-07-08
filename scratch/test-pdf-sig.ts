import { generateConsentPDF } from '../src/lib/pdf.js';
import fs from 'fs';

const sig = 'data:image/png;base64,' + fs.readFileSync('/sessions/practical-dreamy-bardeen/mnt/outputs/sig.b64', 'utf8').trim();

const state: any = {
  pasoActual: 8,
  artistaSeleccionado: { id: '1', nombreYApellidos: 'Lucia Fernandez Gomez', titulacion: 'Técnico Aplicador Oficial', dni: '72888999K', carpetaDriveId: '' },
  datosCliente: { nombreYApellidos: 'Juan Perez Martinez De La Torre', dni: '11222333H', fechaNacimiento: '01/01/1990', domicilio: 'Calle Falsa 123', cp: '39001', localidad: 'Santander', telefono: '600000000' },
  esMenor: false,
  datosRepresentante: { nombreYApellidos: '', dni: '', fechaNacimiento: '', domicilio: '', cp: '', localidad: '', telefono: '', parentesco: '', acreditaMediante: '' },
  datosTecnica: { denominacionGenerica: 'Tatuaje', localizacionAnatomica: 'Antebrazo', tintas: [], otrosMateriales: '', duracion: '2h', posibilidadesEliminacion: 'Láser', presupuesto: '150 EUR' },
  declaracionLeido: true,
  declaracionContraindicaciones: true,
  declaracionSaludSeleccionadas: [],
  confirmadoPrecio: true,
  firmaCliente: sig,
  firmaAplicador: sig,
  lugar: 'Santander',
  fecha: '8/7/2026',
};

const { base64 } = await generateConsentPDF(state);
fs.writeFileSync('/sessions/practical-dreamy-bardeen/mnt/outputs/test_real.pdf', Buffer.from(base64, 'base64'));
console.log('PDF generado OK');
