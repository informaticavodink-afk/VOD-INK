# SDD Specification — PDF final 100% parametrizado

## Change

`consent-pdf-single-source-of-truth`

## Referencia

- Propuesta: `openspec/changes/consent-pdf-single-source-of-truth/proposal.md`

## Requisitos funcionales

### FR-1 — Contrato canónico del PDF

El generador debe aceptar un único contrato `ConsentPdfData`, independiente de `WizardState` y compuesto en backend.

Debe incluir:

- `templateVersion` y fecha de generación;
- snapshot del establecimiento;
- snapshot del tatuador;
- snapshot del cliente;
- snapshot del representante cuando corresponda;
- declaraciones de salud;
- técnica, zona anatómica, duración, eliminación, materiales y presupuesto;
- lista completa de tintas con nombre, AEMPS, lote y caducidad;
- lugar y fecha de consentimiento;
- firma del cliente o representante;
- firma del tatuador.

### FR-2 — Origen de cada dato

| Sección | Fuente autorizada |
|---|---|
| Establecimiento | Fila `studios` vinculada al consentimiento |
| Tatuador | Fila `artists` vinculada al consentimiento |
| Cliente y representante | Columnas de `consents` |
| Salud | `consents.health_flags` |
| Técnica y tintas | `consents.technique_data` guardado por el tatuador |
| Aceptaciones y firma cliente | `consents.legal_acceptance` / registro de firma compatible |
| Firma tatuador | Solicitud autenticada de finalización |
| Fecha de finalización | Reloj del servidor |

El payload del navegador no puede sobrescribir estudio, tatuador, cliente ni técnica durante la firma final.

### FR-3 — Ausencia de valores ficticios

El backend debe rechazar la generación final si cualquier campo obligatorio:

- está vacío;
- contiene un placeholder conocido;
- contiene un fallback de presentación (`N/A`, `No asignado`, guiones de relleno);
- coincide con datos demo retirados del producto sin que el tatuador los haya seleccionado o escrito explícitamente.

La detección de valores demo no debe prohibir una tinta real por su nombre. La prevención principal será que el formulario técnico empiece vacío y que el backend valide el origen persistido de los datos.

### FR-4 — Estado técnico inicial

El consentimiento creado por el cliente debe guardar una técnica vacía o un objeto parcial explícito. No debe persistir automáticamente:

- `Antebrazo izquierdo`;
- presupuesto `150`;
- tintas predefinidas;
- lotes o caducidades de ejemplo;
- materiales o eliminación como si hubieran sido confirmados.

Los catálogos, si se conservan, serán acciones explícitas del tatuador y nunca defaults silenciosos.

### FR-5 — Validación del tatuador

Antes de firmar, el servidor debe validar `technique_data` con un esquema compartido y estricto. Como mínimo son obligatorios:

- denominación;
- localización anatómica;
- duración;
- posibilidades de eliminación;
- materiales;
- presupuesto;
- al menos una tinta;
- nombre, registro AEMPS, lote y caducidad de cada tinta.

No se aceptarán propiedades desconocidas críticas ni arrays vacíos.

### FR-6 — Snapshot inmutable

Al finalizar se debe persistir en `consents.document_snapshot` el `ConsentPdfData` normalizado, excluyendo las imágenes base64 si estas se mantienen en su almacén de firmas y referenciándolas mediante hash.

También se deben persistir:

- `document_template_version`;
- `finalized_at`;
- hash del PDF en `consent_files.sha256`.

Una vez `signed`, el snapshot y la referencia final no se pueden modificar mediante los endpoints ordinarios.

### FR-7 — Archivo final inequívoco

- `consent_files` debe distinguir el tipo de artefacto: `client_evidence`, `final` o `legacy`.
- `consents.final_file_id` debe apuntar al único `consent_files` de tipo `final` del consentimiento.
- Debe existir una restricción que impida más de un archivo final por consentimiento.
- La ruta final será determinista e inmutable, incorporando el hash, por ejemplo:
  `studios/{studioId}/artists/{artistId}/{consentId}/final/{sha256}.pdf`.

### FR-8 — Semántica de estados

- `pending_technique`: falta técnica del tatuador.
- `pending_artist`: técnica válida guardada; falta firma/finalización.
- `signed`: snapshot, PDF final, metadata y `final_file_id` existen.
- `upload_error`: falló la persistencia del archivo final; el expediente puede reintentarse sin perder datos.

El sistema no debe establecer `signed` antes de completar la persistencia final.

### FR-9 — Finalización idempotente

Ante dos solicitudes equivalentes:

- se reutiliza el mismo snapshot/hash/archivo final;
- no se crean dos archivos finales;
- no se duplican filas de firma;
- se devuelve el mismo `final_file_id`.

Si ya existe un documento final con contenido distinto, la operación debe bloquearse y dejar un error auditable; nunca debe sobrescribirlo.

### FR-10 — Descargas

- La descarga individual debe resolver `consents.final_file_id`.
- La exportación ZIP debe incluir como máximo un PDF por consentimiento.
- No se debe usar `.single()` sobre todos los archivos asociados sin filtrar el final.
- Un consentimiento sin `final_file_id` no se presenta como descargable.
- Google Drive, cuando esté habilitado, debe recibir exactamente los bytes del archivo final.

### FR-11 — Datos históricos

Una migración clasificará por nombre/ruta:

- `artist-signed.pdf` como candidato `final`;
- `client-signed.pdf` como `client_evidence`;
- rutas desconocidas como `legacy`.

Solo se asignará `final_file_id` automáticamente cuando exista exactamente un candidato inequívoco. Los casos con cero o varios candidatos se reportarán para revisión y no se resolverán por fecha o azar.

### FR-12 — PDF del establecimiento

La sección A, encabezado y pie deben usar datos reales del estudio. El generador no puede importar configuración de demostración para completar el documento.

Si faltan datos legales obligatorios del estudio, se bloquea la finalización con un mensaje de datos incompletos.

## Requisitos no funcionales

### NFR-1 — Integridad

El hash SHA-256 debe calcularse sobre los mismos bytes almacenados y descargados.

### NFR-2 — Seguridad

La composición final ocurre en backend con service role después de validar que el usuario autenticado corresponde al tatuador asignado. El frontend no puede enviar IDs alternativos para cambiar el expediente.

### NFR-3 — Privacidad

Firmas y snapshot no deben escribirse en logs. Se eliminará el log de depuración del artista y los errores no deben imprimir payloads personales completos.

### NFR-4 — Fiabilidad

La finalización debe tolerar reintentos después de fallo de red, Storage o inserción de metadata. Cada paso debe poder reconciliarse por `consent_id`, tipo y hash.

### NFR-5 — Compatibilidad

Los PDFs históricos permanecen inmutables. El cambio no exige regenerarlos ni elimina artefactos de cliente existentes.

## Escenarios

### SC-1 — Flujo adulto correcto

Dado un cliente adulto con datos válidos y firma registrada
Y un tatuador que completa técnica, tintas y firma
Cuando finaliza el consentimiento
Entonces el PDF contiene exactamente esos datos
Y `status = signed`
Y `final_file_id` apunta a un único archivo `final`.

### SC-2 — Menor con representante

Dado un consentimiento marcado como menor
Cuando se finaliza
Entonces el PDF identifica al cliente y al representante
Y la firma del cliente se atribuye al representante
Y no muestra una firma del menor como si fuera la legal.

### SC-3 — Técnica de ejemplo no confirmada

Dado un consentimiento recién enviado por el cliente
Cuando el tatuador abre la intervención
Entonces zona, presupuesto y tintas empiezan vacíos
Y no puede firmar hasta completarlos.

### SC-4 — Datos del estudio incompletos

Dado un estudio sin CIF, dirección o registro sanitario requerido
Cuando el tatuador intenta finalizar
Entonces la API responde con campos faltantes
Y no genera el PDF
Y el consentimiento no pasa a `signed`.

### SC-5 — Fallo de Storage

Dado un expediente válido
Cuando falla la subida del PDF
Entonces no existe `final_file_id`
Y el estado es `upload_error`
Y un reintento posterior puede finalizar sin duplicar filas.

### SC-6 — Descarga con evidencia y final

Dado un consentimiento con `client_evidence` y `final`
Cuando un administrador descarga o exporta
Entonces recibe únicamente el archivo indicado por `final_file_id`.

### SC-7 — Reintento concurrente

Dadas dos solicitudes simultáneas de finalización
Cuando ambas procesan el mismo consentimiento
Entonces una única referencia final queda persistida
Y ambas terminan con el mismo resultado o una recibe conflicto recuperable.

### SC-8 — Registro histórico ambiguo

Dado un consentimiento histórico con dos candidatos finales
Cuando corre la migración
Entonces no asigna `final_file_id`
Y lo registra en el reporte de revisión manual.

## Criterios de aceptación

- [ ] Los doce requisitos funcionales tienen prueba automatizada o verificación de integración documentada.
- [ ] Existe una prueba que extrae texto de un PDF generado y compara todos los campos variables del fixture.
- [ ] Existe una prueba negativa para placeholders y datos incompletos.
- [ ] Existe una prueba de descarga que selecciona solo `final_file_id`.
- [ ] Existe una prueba de reintento/fallo parcial.
- [ ] `npm run lint`, `npm run test` y `npm run build` pasan.

## Siguiente fase

`design`
