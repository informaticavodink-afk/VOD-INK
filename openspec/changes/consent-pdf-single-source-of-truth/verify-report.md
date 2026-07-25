# Verify Report — PDF final 100% parametrizado

## Estado

**Implementación local y migraciones de Supabase completadas. Falta desplegar el código de aplicación y ejecutar los flujos E2E desde la interfaz.**

## Evidencia automática

| Comando | Resultado |
|---|---|
| `npm run lint` | ✅ TypeScript sin errores |
| `npm run test` | ✅ 6 archivos, 48 pruebas |
| `npm run test:coverage` | ✅ 98,32% líneas global; core 100% |
| `npm run build` | ✅ Frontend y servidor construidos |
| `git diff --check` | ✅ Sin errores de whitespace |

## Umbrales de cobertura

| Área | Líneas | Ramas | Funciones | Statements |
|---|---:|---:|---:|---:|
| Core: `consentPdfSchema.ts` | 100% | 100% | 100% | 100% |
| Core: `consentPdfData.ts` | 100% | 100% | 100% | 100% |
| Renderer PDF | 97,87% | 94,11% | 100% | 97,87% |
| Total instrumentado | 98,32% | 95,28% | 100% | 98,32% |

Infraestructura (`api/**`, rutas HTTP, clientes Supabase/Drive, utilidades y bootstrap) queda explícitamente fuera de instrumentación y con umbral 0, según el alcance acordado.

## Cobertura implementada

- Contrato `ConsentPdfData` validado con Zod.
- Rechazo de placeholders, técnica incompleta y firmas no PNG.
- Composición de estudio, tatuador, cliente y técnica desde filas persistidas.
- Snapshot sin imágenes base64.
- Render PDF probado mediante extracción de texto.
- Generación determinista para el mismo snapshot.
- Defaults técnicos y catálogos demo eliminados del flujo.
- Migración para `document_kind`, snapshot, referencia final e inmutabilidad.
- Ruta final por SHA-256 y reconciliación de reintentos.
- Estado `signed` posterior a Storage, metadata y firma.
- Descarga individual y ZIP mediante `final_file_id`.
- Reintentos `upload_error` expuestos al tatuador.

## Evidencia de pruebas

### Esquema

- Documento completo aceptado.
- Placeholders conocidos rechazados.
- Representante obligatorio para menores.
- Tinta incompleta rechazada.

### Composición

- Datos del estudio, tatuador, cliente y tinta mapeados desde BD.
- Estudio incompleto bloqueado.
- Firmas base64 excluidas del snapshot persistido.

### PDF

- Texto extraído contiene valores únicos de todas las secciones variables.
- Texto extraído no contiene placeholders.
- Dos generaciones del mismo contrato producen los mismos bytes.

## Evidencia Supabase

Proyecto verificado: `igppobmclturtmzqpcyx`.

- ✅ `20260724235900_consent_final_pdf_source_of_truth.sql` aplicada.
- ✅ `20260725000100_harden_consent_final_file_trigger.sql` aplicada.
- ✅ `20260725000200_allow_legacy_signing_during_pdf_rollout.sql` aplicada para no interrumpir el backend publicado durante el despliegue.
- ✅ 5 PDFs históricos clasificados como `final`.
- ✅ 8 PDFs históricos clasificados como `client_evidence`.
- ✅ 0 históricos ambiguos.
- ✅ 0 consentimientos firmados sin `final_file_id`.
- ✅ 0 referencias finales cruzadas o inválidas.
- ✅ 0 finales duplicados.
- ✅ Índice único, FK, check y dos triggers presentes.
- ✅ Pruebas transaccionales confirmaron unicidad, referencia obligatoria e inmutabilidad.
- ✅ Helpers de trigger sin `SECURITY DEFINER` y sin permiso RPC para `anon` o `authenticated`.
- ✅ El formulario de intervención muestra y valida `posibilidadesEliminacion`; prueba de regresión confirma que un formulario completo invoca la firma.
- ✅ La máquina de estados no vuelve a guardar técnica en `pending_artist`/`upload_error`; 10 casos cubren persistencia y reintento de firma.
- ✅ El backend legado puede completar su transición a `signed` durante el rollout (prueba transaccional revertida).
- ✅ `consent-v2` no puede quedar `signed` sin `final_file_id` (prueba transaccional revertida).
- ✅ `supabase db push --dry-run`: base remota actualizada.

## Pendiente antes de producción

- [ ] Desplegar el código de aplicación que consume las nuevas columnas.
- [ ] Completar un flujo adulto real de extremo a extremo.
- [ ] Completar un flujo con menor y representante.
- [ ] Forzar un fallo de Storage y verificar el reintento desde el panel.
- [ ] Descargar individualmente y mediante ZIP desde el entorno desplegado.
- [ ] Revisar visualmente el A4 con textos largos y varias tintas.

## Observaciones

- El build mantiene una advertencia preexistente de bundle superior a 500 kB; no pertenece al alcance del PDF.
- `npm audit --omit=dev` informa vulnerabilidades en dependencias existentes (`body-parser`, `postcss`, `react-router`). Su actualización debe tratarse en un cambio separado para no mezclar alcance.
- Los advisors mantienen advertencias preexistentes sobre `get_active_artists`, protección de contraseñas filtradas y políticas RLS permisivas duplicadas; la función nueva del PDF no añade advertencias.
