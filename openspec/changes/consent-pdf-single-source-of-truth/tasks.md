# SDD Tasks — PDF final 100% parametrizado

## Change

`consent-pdf-single-source-of-truth`

## Referencias

- Propuesta: `openspec/changes/consent-pdf-single-source-of-truth/proposal.md`
- Especificación: `openspec/changes/consent-pdf-single-source-of-truth/spec.md`
- Diseño: `openspec/changes/consent-pdf-single-source-of-truth/design.md`

## Regla de ejecución

Cada unidad se implementará y verificará antes de continuar. No se incluirán refactors visuales, rutas nuevas ni cambios de arquitectura ajenos al PDF.

## Plan de trabajo

### T-1 — Crear la red de seguridad de pruebas

**Estado:** `- [x]`
**Dependencias:** ninguna

**Trabajo:**

- Añadir Vitest y script `npm run test`.
- Configurar extracción de texto PDF en Node para pruebas.
- Crear fixtures con un valor único por cada campo variable.
- Capturar como pruebas rojas los fallos actuales:
  - técnica demo heredada;
  - placeholder de establecimiento;
  - descarga ambigua con dos archivos;
  - estado `signed` antes de persistir el final.

**Verificación:**

- Las nuevas pruebas fallan por las razones esperadas antes de cambiar producción.
- `npm run lint` continúa operativo.

### T-2 — Definir `ConsentPdfData` y validación estricta

**Estado:** `- [x]`
**Dependencias:** T-1

**Trabajo:**

- Crear esquema Zod y tipos canónicos.
- Modelar adulto y menor/representante.
- Añadir normalización y guardia anti-placeholder.
- Compartir el esquema técnico entre frontend y backend.
- Evitar `any` en técnica y snapshot.

**Verificación:**

- Tests de campos completos, ausentes, placeholders y tintas.
- Tests específicos de atribución de firma para menores.

### T-3 — Eliminar defaults ficticios del flujo productivo

**Estado:** `- [x]`
**Dependencias:** T-2

**Trabajo:**

- Vaciar `INITIAL_TECHNIQUE` en el wizard.
- Retirar tintas, zona y presupuesto demo como selección automática.
- Reiniciar correctamente el formulario del tatuador al cambiar de consentimiento.
- Mantener catálogos únicamente como acciones explícitas, si siguen siendo necesarios.
- Validar `PATCH /technique` en backend antes de guardar.

**Verificación:**

- Un consentimiento nuevo persiste técnica vacía/parcial.
- El modal de otro consentimiento no conserva datos del anterior.
- No se puede avanzar a firma con técnica incompleta.

### T-4 — Migrar el modelo de archivos finales

**Estado:** `- [x]` — aplicada y verificada en Supabase `igppobmclturtmzqpcyx`
**Dependencias:** T-2

**Trabajo:**

- Crear migración para `document_kind`, snapshot, versión, `finalized_at` y `final_file_id`.
- Crear índice único parcial para un final por consentimiento.
- Añadir FK y comprobación de pertenencia/tipo.
- Proteger campos finales contra mutación posterior.
- Clasificar archivos históricos conservadoramente.
- Proporcionar consulta/reporte de registros ambiguos.
- Actualizar tipos Supabase y esquema consolidado.

**Verificación:**

- Migración aplica sobre base limpia y sobre fixture con archivos históricos.
- Casos ambiguos quedan sin `final_file_id`.
- La base rechaza dos archivos `final` para un consentimiento.

### T-5 — Componer datos canónicos desde Supabase

**Estado:** `- [x]`
**Dependencias:** T-2, T-4

**Trabajo:**

- Crear compositor backend que lea `consents`, `studios`, `artists` y firmas.
- Validar permisos del tatuador asignado.
- Mapear todos los datos al contrato canónico.
- Bloquear estudio, cliente, representante o técnica incompletos.
- Eliminar logs de payloads sensibles.

**Verificación:**

- Tests de mapeo exacto por campo.
- El payload de firma no puede cambiar estudio, artista, cliente ni técnica.
- El error lista campos faltantes sin exponer el expediente completo.

### T-6 — Refactorizar el renderer PDF

**Estado:** `- [x]`
**Dependencias:** T-2, T-5

**Trabajo:**

- Hacer que `generateConsentPDF` reciba `ConsentPdfData`.
- Eliminar dependencia de configuración demo y fallbacks visibles.
- Parametrizar encabezado, pie y sección del establecimiento.
- Renderizar técnica, tintas, cliente, representante y firmas desde el contrato.
- Sustituir truncado destructivo por wrapping para no perder datos largos.
- Mantener textos legales estáticos fuera del contrato variable.

**Verificación:**

- Extraer texto del PDF de fixture.
- Comprobar presencia exacta de todos los valores variables.
- Comprobar ausencia de placeholders y valores de otro fixture.
- Probar textos largos y múltiples tintas sin pérdida silenciosa.

### T-7 — Implementar finalización idempotente

**Estado:** `- [~]` — código completo; prueba integrada con Storage pendiente
**Dependencias:** T-4, T-5, T-6

**Trabajo:**

- Reemplazar reconstrucción de `WizardState` por el compositor canónico.
- Generar snapshot, bytes y hash.
- Subir a ruta final por hash.
- Insertar o reconciliar `consent_files(final)`.
- Actualizar snapshot, referencia y estado en orden seguro.
- Hacer reintentable `upload_error`.
- Mantener firma e integridad metadata sin duplicados.
- Enviar a Drive únicamente después del cierre principal y con los mismos bytes.

**Verificación:**

- Camino exitoso termina en `signed` con `final_file_id`.
- Fallo de Storage no termina en `signed`.
- Fallo entre Storage y DB se recupera al reintentar.
- Dos llamadas simultáneas no crean dos finales.
- Un final existente con hash distinto no se sobrescribe.

### T-8 — Corregir descarga individual y ZIP

**Estado:** `- [~]` — código completo; smoke test desplegado pendiente
**Dependencias:** T-4, T-7

**Trabajo:**

- Resolver siempre `final_file_id`.
- Eliminar `.single()` sobre el conjunto no filtrado de archivos.
- Ocultar/deshabilitar descarga cuando falta el final.
- Exportar un archivo por consentimiento con nombre único y seguro.
- Aplicar la misma regla a cualquier descarga del panel del tatuador.

**Verificación:**

- Consentimiento con evidencia + final descarga solo final.
- ZIP no sobrescribe ni duplica documentos.
- Históricos ambiguos muestran estado no disponible en lugar de elegir al azar.

### T-9 — Verificación integral y documentación operativa

**Estado:** `- [~]` — verificación local completa; E2E con Supabase pendiente
**Dependencias:** T-1 a T-8

**Trabajo:**

- Ejecutar flujo adulto y menor completo.
- Verificar migración con datos representativos anonimizados.
- Documentar campos obligatorios del estudio y procedimiento de revisión histórica.
- Registrar resultados en `verify-report.md` al aplicar el cambio.

**Verificación:**

```bash
npm run lint
npm run test
npm run build
```

Además:

- comparación automática del texto PDF;
- prueba de descarga individual;
- prueba ZIP;
- prueba de fallo/reintento;
- inspección manual de layout en A4.

## Matriz de cobertura

| Requisito | Tareas |
|---|---|
| Contrato y fuentes canónicas | T-2, T-5 |
| Sin defaults/placeholders | T-1, T-3, T-6 |
| Snapshot e inmutabilidad | T-4, T-7 |
| Un único PDF final | T-4, T-7 |
| Estados y recuperación | T-7 |
| Descarga determinista | T-8 |
| Compatibilidad histórica | T-4, T-8 |
| Prevención de regresiones | T-1, T-6, T-9 |

## Unidades de revisión recomendadas

El cambio completo previsiblemente supera 400 líneas. Para proteger la revisión se propone implementarlo en tres unidades encadenadas:

1. **Contrato y datos:** T-1 a T-4.
2. **Composición y finalización:** T-5 a T-7.
3. **Descargas y verificación:** T-8 y T-9.

Cada unidad debe mantener build y tests en verde. No se separará una migración de los tipos y pruebas que validan su comportamiento.

## Definition of Done

- [ ] PDF final compuesto solo desde datos persistidos y validados.
- [ ] No quedan datos técnicos demo como defaults silenciosos.
- [ ] Estudio, tatuador, cliente, tutor, técnica, tintas y firmas están parametrizados.
- [ ] Existe un único archivo final referenciado explícitamente.
- [ ] `signed` implica que el archivo final existe y tiene hash.
- [ ] Descarga y ZIP seleccionan solo el final.
- [ ] Fallos y reintentos no duplican ni sobrescriben el documento.
- [ ] Históricos ambiguos no se resuelven automáticamente.
- [ ] Tests, lint y build pasan.
- [ ] Se crea `verify-report.md` con evidencia de aceptación.

## Siguiente fase

`apply`, únicamente después de aprobar este plan.
