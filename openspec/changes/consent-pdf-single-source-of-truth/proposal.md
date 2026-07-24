# SDD Proposal — PDF final 100% parametrizado

## Change

`consent-pdf-single-source-of-truth`

## Decisión

El sistema generará **un único PDF final descargable** después de que el cliente y el tatuador hayan completado sus respectivas partes. El servidor compondrá el documento exclusivamente con datos persistidos y validados de Supabase; ningún valor de demostración, placeholder o fallback inventado podrá aparecer en un documento final.

## Problema observado

El flujo actual permite que datos de ejemplo lleguen al PDF y no distingue de forma inequívoca el PDF preliminar del PDF final:

- `WizardPage` inicia la técnica con zona, tinta y presupuesto de ejemplo, aunque el cliente no completa esos datos.
- `pdf.ts` contiene textos de establecimiento hardcodeados o placeholders.
- El primer envío crea `client-signed.pdf`; la firma del tatuador crea `artist-signed.pdf`.
- `consent_files` puede contener varios archivos para el mismo consentimiento.
- La descarga administrativa usa `.single()` sin seleccionar la fase final.
- La exportación ZIP puede incluir dos archivos con el mismo nombre y sobrescribir uno dentro del ZIP.
- El PDF se arma desde `WizardState`, un estado de interfaz que mezcla datos reales, defaults y fallbacks.

El resultado es un documento legal que puede mostrar información ajena a la operación real o no ser descargable de forma determinista.

## Resultado esperado

Cuando un tatuador confirma la intervención y firma:

1. El servidor lee de Supabase el estudio, tatuador, cliente, representante, salud, técnica y firma del cliente.
2. Valida que el expediente esté completo y no contenga placeholders.
3. Construye un contrato tipado `ConsentPdfData`.
4. Guarda una instantánea inmutable de los datos usados.
5. Genera y almacena exactamente un PDF final identificable.
6. Marca el consentimiento como `signed` solo cuando el PDF y su metadata estén persistidos.
7. Los paneles descargan exclusivamente el archivo apuntado por `consents.final_file_id`.

## Alcance

### Incluido

- Eliminar datos técnicos de ejemplo del estado inicial productivo.
- Separar el estado del formulario del contrato del PDF.
- Validar en backend los datos de cliente y técnica.
- Cargar los datos del establecimiento desde `studios`.
- Cargar el tatuador desde `artists` y el expediente desde `consents`.
- Crear una instantánea inmutable del documento final.
- Identificar explícitamente el archivo final en base de datos.
- Hacer idempotente y recuperable la finalización.
- Corregir descarga individual y exportación ZIP.
- Añadir pruebas automáticas contra placeholders, defaults ficticios, archivos ambiguos y regresiones de parametrización.
- Definir tratamiento compatible para consentimientos y archivos históricos.

### Fuera de alcance

- Cambiar el diseño visual general del wizard o de los paneles.
- Modificar autenticación, roles o RLS salvo el acceso mínimo requerido por las nuevas columnas.
- Retomar la arquitectura multiempresa.
- Cambiar los textos legales, salvo sustituir referencias variables por datos del snapshot.
- Google Drive, salvo asegurar que reciba el mismo PDF final ya generado.
- Firma electrónica avanzada, certificados cualificados o sellado de tiempo externo.
- Regenerar automáticamente PDFs históricos con datos que no puedan reconstruirse con certeza.
- Crear nuevos paneles, rutas o notificaciones.

## Principios

- **Supabase es la fuente de verdad.** El navegador no decide el contenido final.
- **Sin datos inventados.** Un dato ausente bloquea la finalización; no activa un fallback visible.
- **Un consentimiento, un archivo final.** Los artefactos anteriores pueden conservarse como evidencia, pero no se ofrecen como documento definitivo.
- **Finalización consistente.** `signed` significa que existe un PDF final íntegro y referenciado.
- **Documento inmutable.** Cambios posteriores en estudio o tatuador no alteran lo firmado.
- **Compatibilidad explícita.** Los registros históricos se clasifican; no se adivina cuál es el final.

## Criterios de éxito

- [ ] Ningún PDF final contiene valores de ejemplo, placeholders ni fallbacks como `N/A` o `No asignado`.
- [ ] Todos los campos variables proceden del snapshot construido desde Supabase.
- [ ] Técnica, zona, materiales, tintas, lotes, caducidades, presupuesto y firma reflejan lo confirmado por el tatuador.
- [ ] Datos personales, representante, salud y firma del cliente reflejan lo enviado por el cliente.
- [ ] Datos de establecimiento y tatuador reflejan sus registros persistidos.
- [ ] Cada consentimiento nuevo firmado tiene un único `final_file_id`.
- [ ] La descarga individual y el ZIP usan exclusivamente ese archivo.
- [ ] Un fallo de Storage o metadata no deja el consentimiento falsamente marcado como `signed`.
- [ ] Reintentar una finalización no duplica documentos ni firmas.
- [ ] `npm run lint`, `npm run build` y la nueva suite de pruebas pasan.

## Relación con cambios anteriores

Este cambio complementa `saas-document-integrity`: conserva hashes y firmas separadas, pero corrige la ambigüedad introducida al mantener archivos por fase sin una referencia explícita al documento final.

## Siguiente fase

`spec`
