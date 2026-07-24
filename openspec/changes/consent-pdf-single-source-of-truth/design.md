# SDD Design — PDF final 100% parametrizado

## Change

`consent-pdf-single-source-of-truth`

## Referencias

- Propuesta: `openspec/changes/consent-pdf-single-source-of-truth/proposal.md`
- Especificación: `openspec/changes/consent-pdf-single-source-of-truth/spec.md`
- Integridad previa: `openspec/changes/saas-document-integrity/`

## Flujo objetivo

```text
Cliente envía formulario y firma
        │
        ▼
consents: pending_technique
(firma/evidencia cliente persistida; no hay PDF final)
        │
        ▼
Tatuador completa técnica validada
        │
        ▼
consents: pending_artist
        │
        ▼
Tatuador firma
        │
        ▼
Backend carga studio + artist + consent + firmas
        │
        ▼
ConsentPdfDataSchema valida y normaliza
        │
        ▼
Snapshot → PDF → SHA-256 → Storage → consent_files(final)
        │
        ▼
consents.final_file_id + finalized_at + signed
        │
        ▼
Descargas resuelven final_file_id
```

## Decisiones de diseño

### 1. `WizardState` deja de ser el contrato documental

`WizardState` seguirá siendo estado de UI del flujo público, pero `generateConsentPDF` aceptará `ConsentPdfData`.

Se crearán:

- `src/domain/consents/consentPdfSchema.ts`: esquemas y tipos puros.
- `server/consentPdfData.ts`: consulta y composición desde Supabase.
- `src/lib/pdf.ts`: renderizado sin consultas ni defaults de negocio.

Esto permite probar por separado composición, validación y renderizado.

### 2. Técnica vacía hasta intervención explícita

`INITIAL_TECHNIQUE` no contendrá zona, tinta, lote, caducidad ni presupuesto de muestra. La creación pública puede almacenar `technique_data = {}` porque el estado es `pending_technique`.

`InterventionModal` usará valores vacíos para los datos de intervención. Los textos operativos que realmente sean políticas fijas del estudio solo podrán venir de configuración persistida o requerir confirmación explícita; no serán tratados como datos ya introducidos.

El endpoint de técnica validará el payload con el mismo esquema antes de persistirlo.

### 3. Snapshot legal inmutable

Se añadirán a `consents`:

```text
document_snapshot         jsonb nullable
document_template_version text nullable
final_file_id             uuid nullable
finalization_started_at   timestamptz nullable
finalized_at              timestamptz nullable
```

El snapshot contendrá texto normalizado y hashes/referencias de firma, no duplicará imágenes base64 cuando no sea necesario. El PDF se genera en la misma operación lógica a partir de la versión completa en memoria.

Una restricción/trigger impedirá cambiar `document_snapshot`, `document_template_version`, `final_file_id`, `finalization_started_at` y `finalized_at` después de alcanzar `signed`, salvo una operación administrativa futura fuera de este alcance.

### 4. Tipo de archivo y unicidad final

Se añadirá a `consent_files`:

```text
document_kind text not null default 'legacy'
```

Valores admitidos: `client_evidence`, `final`, `legacy`.

Restricciones:

```sql
check (document_kind in ('client_evidence', 'final', 'legacy'))
create unique index consent_files_one_final_per_consent
  on consent_files(consent_id)
  where document_kind = 'final';
```

Después de crear la FK:

```text
consents.final_file_id → consent_files.id (ON DELETE RESTRICT)
```

Una comprobación de backend y trigger diferido verificará que el archivo referenciado pertenece al mismo consentimiento y tiene `document_kind = 'final'`.

### 5. Ruta inmutable por contenido

La ruta será:

```text
studios/{studioId}/artists/{artistId}/{consentId}/final/{sha256}.pdf
```

Ventajas:

- el contenido no se sobrescribe;
- el reintento puede detectar el mismo hash;
- un contenido diferente no puede reemplazar silenciosamente el documento firmado.

Los artefactos `client-signed.pdf` existentes se conservan como `client_evidence`.

### 6. Orden de finalización y recuperación

Supabase Storage y PostgreSQL no comparten transacción. Se usará una operación reconciliable:

1. Bloquear lógicamente el consentimiento comprobando estado y usuario.
2. Leer todos los datos canónicos.
3. Reclamar una única `finalization_started_at` para estabilizar fecha, metadata y hash ante reintentos.
4. Validar, construir snapshot y generar bytes y hash.
5. Subir a ruta por hash; si ya existe, verificar que corresponde al mismo hash.
6. Insertar/recuperar `consent_files(final)` de forma idempotente.
7. En una actualización condicionada, guardar snapshot, `final_file_id`, `finalized_at`, firma y `status = signed`.
8. Subir a Drive después del cierre principal; Drive no decide si el consentimiento está firmado.

Ante un fallo entre los pasos 5 y 7, el reintento encuentra y reconcilia el archivo huérfano por ruta/hash. Si el fallo es no recuperable, se marca `upload_error`; nunca `signed` sin referencia final.

### 7. Endpoint único de finalización

El flujo actual realiza dos PATCH separados: técnica y firma. Se mantendrá `PATCH /technique` para guardar borradores, pero la firma final llamará a una operación de finalización que:

- recibe solamente la firma y, opcionalmente, una revisión/versionado optimista de la técnica;
- vuelve a leer la técnica de base de datos;
- valida todo;
- genera y cierra el documento.

No se reconstruirá `WizardState` con fallbacks como `Santander`, fecha actual ante ausencia o cualificación genérica.

### 8. Descarga por referencia, no por búsqueda ambigua

`ConsentsManager` consultará `final_file_id` y resolverá esa fila. Para ZIP se consultarán los IDs finales de los consentimientos seleccionados y se deduplicará por `consent_id`.

Los nombres serán sanitizados y únicos, por ejemplo:

```text
Consentimiento_{cliente}_{fecha}_{consentId-corto}.pdf
```

### 9. Compatibilidad histórica

La migración:

1. Clasifica rutas `*/artist-signed.pdf` como `final` solo si no hay más de una.
2. Clasifica `*/client-signed.pdf` como `client_evidence`.
3. Deja el resto como `legacy`.
4. Asigna `final_file_id` únicamente en casos inequívocos.
5. Emite consultas de diagnóstico para casos sin final o ambiguos.

No se cambia el contenido ni hash de PDFs existentes.

### 10. Datos del establecimiento

La composición consultará `studios` por `consent.studio_id`. Campos mínimos para finalizar:

- `legal_name` o `trade_name`;
- `tax_id`;
- `address`, `city`, `postal_code`;
- `phone`;
- `health_registration_number`;
- `health_authorization_date`.

No se importará `ESTABLECIMIENTO_VOD_INK` en el renderer. La marca del encabezado y pie procederá del snapshot del estudio.

### 11. Validación de placeholders

Habrá una lista de patrones defensivos para documentos finales:

```text
aquí iría
[Dirección ...]
[CIF]
No asignado
N/A
Tatuador Ejemplo
00000000T
```

La lista es una última barrera, no la fuente principal de validación. Los mensajes de error identificarán el campo, sin registrar datos sensibles.

### 12. Pruebas

Se añadirá Vitest y un extractor PDF apto para tests (`pdfjs-dist` en entorno Node).

Capas:

| Capa | Pruebas |
|---|---|
| Esquema | completos, vacíos, placeholders, menor/representante, tintas |
| Compositor | mapeo exacto de filas Supabase a `ConsentPdfData` |
| Renderer | extracción de texto y comparación con fixture parametrizado |
| Finalización | éxito, Storage fallido, reintento, conflicto de hash |
| Descarga | selección exclusiva de `final_file_id`, ZIP sin duplicados |
| Migración | clasificación inequívoca y casos ambiguos |

Los fixtures usarán valores únicos por campo para detectar cruces accidentales, no datos personales reales.

## Cambios de datos

Migración propuesta:

`supabase/migrations/<timestamp>_consent_final_pdf_source_of_truth.sql`

Debe:

- añadir `document_kind`;
- clasificar filas existentes;
- crear índice único parcial;
- añadir snapshot/version/finalized_at/final_file_id;
- añadir FK y validación de pertenencia;
- proteger campos finales inmutables;
- actualizar tipos TypeScript y el esquema consolidado si este sigue siendo parte del proceso de despliegue.

## Archivos previstos

| Área | Archivos principales |
|---|---|
| Dominio | `src/domain/consents/consentPdfSchema.ts` |
| Composición | `server/consentPdfData.ts`, `server/consents.ts` |
| Render PDF | `src/lib/pdf.ts` |
| Formulario | `src/pages/WizardPage.tsx`, `src/components/artist/InterventionModal.tsx` |
| API | endpoints de técnica y firma/finalización |
| Descarga | `src/components/admin/ConsentsManager.tsx` y equivalente de artista si aplica |
| Datos | migración, `src/types/supabase.ts`, esquema consolidado |
| Pruebas | `src/**/*.test.ts`, `server/**/*.test.ts` o `tests/consents/*` |

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Storage subido pero DB no cerrada | Ruta por hash y reconciliación idempotente |
| Dos finalizaciones simultáneas | Índice único, actualización condicionada y conflicto recuperable |
| Históricos ambiguos | No adivinar; reporte manual |
| Datos del estudio incompletos | Bloqueo previo con lista de campos faltantes |
| Snapshot contiene firmas sensibles | Persistir hashes/referencias; evitar logs |
| Cambio demasiado grande | Implementar en unidades revisables y no mezclar UI ajena |
| Catálogo real confundido con demo | Defaults vacíos; catálogo solo por selección explícita |

## Rollback

- La migración es aditiva y no elimina PDFs.
- El código anterior puede seguir leyendo `consent_files`, aunque el rollback debe conservar las nuevas columnas.
- No se revertirá un consentimiento ya finalizado ni se eliminará `final_file_id` automáticamente.
- Si el nuevo renderer falla, se detiene la finalización; no se vuelve a generar un PDF con defaults.

## Verificación de aceptación

1. Ejecutar migraciones sobre una copia de datos representativos.
2. Revisar el reporte de archivos históricos ambiguos.
3. Completar un flujo adulto y otro con representante.
4. Extraer texto de ambos PDFs y comparar todos los valores variables.
5. Forzar fallo de Storage y reintentar.
6. Descargar individualmente y por ZIP.
7. Ejecutar `npm run lint`, `npm run test` y `npm run build`.

## Siguiente fase

`tasks`
