# Plan SDD — próximos pasos VOD INK

Este plan ordena el trabajo por impacto y dependencias. La prioridad es dejar primero una base segura de datos, roles y consentimientos; después construir los paneles; y al final pulir privacidad, flujo de firma, redirección y QR.

## Decisión rápida

| Prioridad | Bloque | Por qué va primero |
|---|---|---|
| P0 | Supabase, modelo de datos, roles y permisos | Sin esto, los paneles no pueden consultar ni guardar datos de forma fiable. |
| P1 | Flujo de consentimiento final y almacenamiento real | Es el núcleo legal del producto. Debe evitar duplicados y guardar PDF + metadata. |
| P1 | Panel propietario de estudio | Permite administrar tatuadores y consultar consentimientos. |
| P1 | Panel tatuador | Permite ver documentos propios y pendientes de firma. |
| P2 | Privacidad / pixelado global | Requisito de protección de datos visible en todas las vistas. |
| P2 | Redirección postfirma y limpieza de sesión | Cierra correctamente el flujo público y reduce firmas duplicadas. |
| P3 | QR con URL correcta | Depende de que la URL pública y rutas estén estabilizadas. |
| P3 | Pulido, auditoría, métricas y pruebas E2E | Mejora fiabilidad antes de entrega final. |

## Alcance SDD

### Objetivo funcional

Construir una plataforma con tres experiencias separadas:

1. **Cliente**: completa y firma el consentimiento desde QR/tablet.
2. **Tatuador**: consulta sus consentimientos y recibe avisos de documentos pendientes.
3. **Propietario del estudio**: administra tatuadores y consulta todos los consentimientos.

### Estado actual observado

- Aplicación React + Vite con servidor Express.
- Consentimientos generados como PDF en frontend.
- Registro actual en `localStorage` y backup local `data/submissions.json` / `data/pdfs`.
- Lista de tatuadores hardcodeada en `src/lib/config.ts`.
- No hay routing real, autenticación, roles ni base de datos remota todavía.

## Principios de diseño

- **Legal primero**: nunca perder consentimiento firmado aunque falle una integración externa.
- **Privacidad por defecto**: datos sensibles ocultables en cualquier vista administrativa o pública.
- **Roles estrictos**: propietario ve todo; tatuador solo ve lo suyo; cliente no accede a paneles.
- **Evitar duplicados**: cada firma debe producir un registro idempotente y cerrar la sesión local.
- **Migración progresiva**: mantener fallback local temporal hasta verificar Supabase.

## Roadmap por fases

## Fase 0 — Contrato técnico y decisiones pendientes

**Prioridad:** P0  
**Resultado:** especificación aprobada antes de tocar funcionalidades grandes.

### Decisiones a cerrar

| Tema | Recomendación |
|---|---|
| Tiempo de redirección postfirma | Usar 5 segundos como valor final, configurable con `POST_SIGNATURE_REDIRECT_SECONDS`. La mención de 3 segundos queda absorbida como requisito anterior. |
| Dónde apunta el QR | A la vista pública de consentimiento: `/consent?studioId=<id>` o `/consent/<studioSlug>`. No debería abrir paneles privados. |
| Autenticación | Supabase Auth para propietario y tatuadores. Cliente sin login. |
| Estado de consentimiento | `draft`, `pending_artist`, `signed`, `upload_error`, `cancelled` según se mantenga o no firma de tatuador. |
| Respaldo visual del cliente | Eliminar mensajes de backup/Drive de la vista cliente. Mostrar solo “Envío correcto”. |

### Criterios de aceptación

- [ ] Hay rutas definidas para cliente, propietario y tatuador.
- [ ] Hay modelo de datos Supabase aprobado.
- [ ] Hay política clara de permisos por rol.
- [ ] Hay decisión única para temporizador postfirma.

---

## Fase 1 — Supabase base: datos, almacenamiento y roles

**Prioridad:** P0  
**Depende de:** Fase 0  
**Resultado:** reemplazar hardcode/localStorage como fuente principal.

### Especificación

Crear base inicial en Supabase con tablas mínimas:

| Tabla | Uso |
|---|---|
| `studios` | Datos del estudio. |
| `profiles` | Usuario autenticado, rol y relación con estudio. |
| `artists` | Tatuadores gestionables, activos/pausados. |
| `consents` | Metadata legal del consentimiento. |
| `consent_files` | Ruta del PDF en Supabase Storage, hash y estado. |
| `notifications` | Avisos pendientes para tatuadores/propietario. |
| `audit_logs` | Cambios relevantes: creación, edición, firma, descarga. |

### Campos mínimos recomendados

#### `artists`

- `id`
- `studio_id`
- `profile_id` nullable
- `full_name`
- `dni`
- `qualification`
- `photo_url`
- `drive_folder_id` nullable
- `status`: `active | paused`
- `created_at`, `updated_at`

#### `consents`

- `id`
- `studio_id`
- `artist_id`
- `client_full_name`
- `client_dni`
- `client_birth_date`
- `client_phone`
- `is_minor`
- `representative_full_name` nullable
- `representative_dni` nullable
- `health_flags` jsonb
- `technique_data` jsonb
- `signed_at`
- `status`
- `idempotency_key`
- `created_at`, `updated_at`

#### Storage

Bucket privado: `consent-pdfs`  
Ruta sugerida: `studios/{studioId}/artists/{artistId}/{yyyy-mm}/{consentId}.pdf`

### Seguridad

- Activar RLS en tablas sensibles.
- Propietario: lectura/escritura por `studio_id`.
- Tatuador: lectura de consentimientos donde `artist_id` coincide.
- Cliente: solo puede insertar vía endpoint controlado o RPC pública con validación.
- PDFs privados, descarga mediante signed URL temporal.

### Criterios de aceptación

- [ ] Migraciones SQL creadas.
- [ ] Tipos TypeScript generados o definidos.
- [ ] Cliente Supabase configurado por variables de entorno.
- [ ] Storage privado operativo.
- [ ] RLS probada con propietario y tatuador.

---

## Fase 2 — Flujo de firma final e idempotencia

**Prioridad:** P1  
**Depende de:** Fase 1  
**Resultado:** consentimiento firmado guardado correctamente, sin duplicados.

### Especificación

Modificar el final del wizard:

1. Cliente firma.
2. Se muestra botón **Confirmar y enviar**.
3. Al confirmar:
   - generar PDF;
   - crear/actualizar registro en Supabase;
   - subir PDF a Storage;
   - marcar consentimiento como enviado o firmado;
   - limpiar estado local;
   - mostrar mensaje “Envío correcto”.
4. Redirigir al inicio tras 5 segundos.

### Cambios clave

- Eliminar de la vista cliente la sección visual de respaldo/Drive/cache.
- Sustituir “cuadro verde” por mensaje simple de envío correcto.
- Usar `idempotency_key` por sesión de firma para impedir duplicados.
- Limpiar `localStorage/sessionStorage` relacionado al wizard al finalizar.
- Mantener fallback local solo como emergencia técnica, no visible al cliente.

### Criterios de aceptación

- [ ] No se puede enviar dos veces el mismo consentimiento refrescando pantalla.
- [ ] El PDF queda en Supabase Storage.
- [ ] La metadata queda en `consents`.
- [ ] Tras confirmar se ve “Envío correcto”.
- [ ] A los 5 segundos vuelve al inicio.
- [ ] La caché de formulario queda limpia.

---

## Fase 3 — Panel propietario del estudio

**Prioridad:** P1  
**Depende de:** Fase 1  
**Resultado:** administración central del estudio.

### Rutas sugeridas

- `/admin`
- `/admin/artists`
- `/admin/consents`
- `/admin/settings`

### Funciones

#### Gestión de tatuadores

- Crear perfil de tatuador.
- Editar nombre, DNI, titulación, foto, carpeta externa opcional.
- Pausar perfil.
- Activar perfil.
- Ver estado y última actividad.

#### Consulta de consentimientos

- Tabla con filtros por:
  - tatuador;
  - cliente;
  - DNI;
  - fecha;
  - estado.
- Abrir detalle del consentimiento.
- Descargar PDF mediante signed URL.
- Ver auditoría básica.

### Criterios de aceptación

- [ ] Solo propietario accede al panel.
- [ ] Se pueden crear, editar, pausar y activar tatuadores.
- [ ] Los tatuadores pausados no aparecen en el wizard público.
- [ ] Se listan todos los consentimientos del estudio.
- [ ] Se puede descargar un PDF sin hacer público el bucket.

---

## Fase 4 — Panel tatuador

**Prioridad:** P1  
**Depende de:** Fases 1 y 3  
**Resultado:** cada tatuador ve y gestiona solo su trabajo.

### Rutas sugeridas

- `/artist`
- `/artist/consents`
- `/artist/notifications`

### Funciones

- Tabla de consentimientos filtrados automáticamente por `artist_id`.
- Filtros por cliente, fecha y estado.
- Indicador de documentos pendientes de firma/revisión.
- Notificaciones internas para:
  - consentimiento pendiente;
  - error de subida PDF;
  - documento firmado hoy;
  - datos incompletos si aplica.

### Criterios de aceptación

- [ ] Un tatuador no puede ver consentimientos de otro tatuador.
- [ ] La tabla carga solo registros propios.
- [ ] Las notificaciones distinguen pendientes y resueltos.
- [ ] El panel muestra contador de pendientes.

---

## Fase 5 — Privacidad / pixelado global

**Prioridad:** P2  
**Depende de:** paneles en marcha  
**Resultado:** datos sensibles ocultables en todas las vistas.

### Especificación

Agregar un botón global de privacidad en header/layout:

- Estado normal: datos visibles.
- Estado privacidad: nombres, DNI, teléfono, fecha nacimiento, dirección, firmas y salud aparecen pixelados/blur.
- Interacción directa: permitir revelar temporalmente un campo con press/hover controlado si se decide.
- Auto-privacidad opcional: activar blur tras inactividad.

### Implementación sugerida

- Crear `PrivacyModeProvider` global.
- Crear componente `SensitiveText`.
- Crear clase CSS `.privacy-blur` con `filter: blur(...)` o máscara pixelada.
- Aplicar en cliente, panel propietario y panel tatuador.

### Criterios de aceptación

- [ ] Botón disponible en todas las vistas.
- [ ] El modo privacidad persiste durante navegación.
- [ ] Todos los datos personales y de salud quedan ocultos.
- [ ] PDFs/firmas miniatura también quedan ocultos en pantalla.

---

## Fase 6 — QR y rutas públicas

**Prioridad:** P3  
**Depende de:** rutas y Supabase  
**Resultado:** QR estable para iniciar el consentimiento.

### Especificación

- Definir URL pública única del flujo cliente.
- Incluir `studioSlug` o `studioId` en la URL.
- Si se imprime QR, evitar parámetros frágiles o temporales.
- Si hay múltiples estudios en el futuro, soportar multi-tenant desde el inicio.

### Criterios de aceptación

- [ ] El QR abre el wizard público correcto.
- [ ] No requiere login para el cliente.
- [ ] Solo muestra tatuadores activos.
- [ ] Funciona en tablet/móvil.

---

## Fase 7 — Pruebas, auditoría y entrega

**Prioridad:** P3  
**Depende de:** todo lo anterior  
**Resultado:** entrega validada y revisable.

### Pruebas mínimas

| Tipo | Casos |
|---|---|
| Unitarias | validación DNI, generación de idempotency key, helpers de privacidad. |
| Integración | crear consentimiento, subir PDF, listar por rol. |
| E2E | flujo cliente completo, panel propietario, panel tatuador. |
| Seguridad | RLS propietario/tatuador, Storage privado, signed URL. |
| UX | tablet, móvil, redirección, modo privacidad. |

### Checklist final

- [ ] Build sin errores TypeScript.
- [ ] Variables de entorno documentadas.
- [ ] Migraciones Supabase versionadas.
- [ ] RLS validada.
- [ ] PDF descargable solo por roles permitidos.
- [ ] Redirección postfirma estable.
- [ ] No quedan datos sensibles visibles con privacidad activada.

## Orden recomendado de implementación

1. Crear estructura de rutas/layouts.
2. Configurar Supabase client + env.
3. Crear migraciones SQL y Storage.
4. Migrar tatuadores hardcodeados a `artists`.
5. Guardar consentimiento en Supabase y subir PDF.
6. Implementar confirmación final + redirección 5s + limpieza local.
7. Crear auth y roles.
8. Crear panel propietario.
9. Crear panel tatuador.
10. Implementar privacidad global.
11. Integrar URL final en QR.
12. Pruebas, documentación y revisión.

## Riesgos principales

| Riesgo | Mitigación |
|---|---|
| Datos médicos visibles accidentalmente | PrivacyMode global + RLS + bucket privado. |
| Firmas duplicadas | `idempotency_key`, bloqueo de botón y limpieza postfirma. |
| PDFs perdidos por fallo de red | Guardar metadata transaccional y estado `upload_error`; permitir reintento admin. |
| Tatuador ve datos ajenos | Políticas RLS y tests de permisos. |
| QR apunta a una ruta incorrecta | Congelar URL pública antes de imprimir/distribuir. |

## Definición de hecho global

El trabajo se considera terminado cuando un cliente puede firmar desde QR, el consentimiento queda guardado en Supabase con PDF privado, el propietario puede gestionar tatuadores y ver todos los consentimientos, cada tatuador ve solo sus consentimientos, y cualquier vista puede ocultar datos sensibles con el modo privacidad.
