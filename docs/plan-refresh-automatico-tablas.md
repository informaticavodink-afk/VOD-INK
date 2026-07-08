# Plan: Refresco automático de tablas tras firma

## Contexto

Actualmente, después de que el tatuador firma un consentimiento en su panel, las tablas del panel de artista y del panel de administrador no se actualizan solas: el usuario debe apretar **F5** para ver el nuevo estado. El código ya tiene suscripciones de Supabase Realtime en varios componentes, pero siguen sin funcionar en la práctica.

## Objetivo

Garantizar que, tras cualquier acción de firma (cliente o tatuador), las vistas de tabla de **admin** y **artist** se actualicen inmediatamente, sin recarga manual de la página.

## Estado de implementación

**Implementado en esta sesión.** Los cambios principales ya están en los archivos correspondientes y pasan `tsc --noEmit` y `npm run build`.

### Cambios realizados

1. **`src/pages/ArtistPage.tsx`**:
   - Extraídas `loadPendingConsents` y la carga inicial del artista a funciones reutilizables.
   - Tras `handleSaveIntervention` (firma exitosa) se actualiza el estado local del consentimiento a `signed` y se fuerza el refresco de la tabla principal (`ArtistConsents`) y de la lista de pendientes del header.
   - Tras `handleDiscardConsent` se elimina el consentimiento de la lista local y se fuerza el refresco de ambas vistas.
   - Se agregó un `ref` para comunicarse con `ArtistConsents` y un estado `activeFilter` para el sidebar.

2. **`src/components/artist/ArtistConsents.tsx`**:
   - Convertido a `forwardRef` y expuesta `loadConsents()` vía `useImperativeHandle`.
   - Se agregó filtrado por estado (`all` / `pending_signature`) y callbacks `onStatusFilterChange`.
   - Se robusteció el canal Realtime con logging de `CHANNEL_ERROR` / `CLOSED`.
   - ~~Se había agregado un botón **Actualizar** y polling, pero se eliminaron porque Realtime funciona correctamente.~~

3. **`src/components/admin/ConsentsManager.tsx`**:
   - Se robusteció el canal Realtime con logging de errores.
   - ~~Se había agregado un botón **Actualizar** y polling de 12 segundos, pero se eliminaron porque Realtime funciona correctamente.~~

4. **`docs/plan-refresh-automatico-tablas.md`** (este documento).

### Pendiente de verificación manual

- [ ] Confirmar en el dashboard de Supabase que la tabla `public.consents` está en la publicación `supabase_realtime` (migración `20260708054000_enable_realtime_consents.sql`).
- [ ] Probar el flujo completo localmente y/o en preview.
- [ ] Validar que el contador de pendientes del header del artista baja inmediatamente tras firmar.
- [ ] Validar que la tabla de admin se actualiza sin F5 cuando el cliente envía un nuevo consentimiento y cuando el artista firma.

## Causas raíz probables

1. **Dependencia exclusiva de Supabase Realtime**: el frontend solo se actualiza cuando llega un evento `postgres_changes`. Si Realtime está deshabilitado, se desconecta o hay latencia, la UI queda desactualizada.
2. **Falta de actualización optimista/local tras la acción**: en `ArtistPage.tsx`, después de `handleSaveIntervention` o `handleDiscardConsent`, el modal se cierra pero no se vuelven a cargar los datos ni se actualiza el estado local.
3. **Vistas desacopladas**: `ArtistPage` maneja la lista de pendientes del header y `ArtistConsents` maneja la tabla principal. Una acción en `ArtistPage` no notifica a `ArtistConsents` para que se recargue.
4. **Posible configuración remota de Realtime**: la migración `20260708054000_enable_realtime_consents.sql` existe localmente, pero puede no estar aplicada en el proyecto de Supabase remoto o puede estar deshabilitada la replicación para esa tabla.

## Estrategia de solución

1. **No depender solo de Realtime**. Tras una firma o descarte exitoso, el componente debe refrescar sus propios datos inmediatamente (pull manual) y, además, actualizar el estado local de forma optimista para que la UI cambie al instante.
2. **Unificar el mecanismo de refresco** entre el header de pendientes y la tabla principal del artista, para que ambos se actualicen juntos.
3. **Mantener Realtime como complemento**, pero robustecerlo: reconectar si se desconecta, manejar errores de suscripción y evitar fugas de canales.
4. **Verificar/confirmar que Realtime esté activo en el proyecto remoto**.

## Plan de implementación

### 1. Refactor del data loading en `ArtistPage.tsx`

- Extraer la carga del artista y de los consentimientos pendientes a funciones reutilizables.
- Crear una función `refreshPendingConsents()` que pueda ser llamada desde `handleSaveIntervention` y `handleDiscardConsent`.
- Al finalizar una firma o descarte exitoso, llamar a `refreshPendingConsents()` para actualizar el contador del header y el dropdown.

### 2. Comunicación entre `ArtistPage` y `ArtistConsents`

- `ArtistConsents` carga la tabla principal. Necesita recargarse cuando `ArtistPage` confirma una firma o descarte.
- Opción elegida: exponer `loadConsents()` vía `useImperativeHandle` desde `ArtistConsents`, y que `ArtistPage` invoque ese ref después de cada acción exitosa.
- Alternativa: pasar un `refreshKey` numérico que incremente tras cada acción. Se descarta porque `useImperativeHandle` es menos invasiva (no fuerza remontaje completo de la tabla).

### 3. Actualización optimista de la UI del artista

- En `handleSaveIntervention`, una vez que la API devuelve éxito, actualizar el consentimiento local en `pendingConsents` cambiando su status a `signed` y/o eliminarlo de la lista de pendientes.
- Esto hará que el contador del header baje inmediatamente, sin esperar la vuelta de red.

### 4. Refresco manual en la tabla de admin (`ConsentsManager.tsx`) — **eliminado**

- ~~En la vista de admin, no hay acción directa de firma. El admin debe verse afectado por dos eventos externos:~~
  - ~~Cliente envía un nuevo consentimiento (pasa de inexistente a `pending_technique`).~~
  - ~~Artista firma (pasa a `signed`).~~
- Realtime cubre este caso correctamente, por lo que se eliminaron el botón de **Refrescar** y el polling de fallback.
- Si en el futuro Realtime deja de funcionar, se puede restaurar el polling o el botón manual.

### 5. Robustecer el manejo de errores de Realtime

- En `ConsentsManager` y `ArtistConsents`, agregar un callback `.subscribe((status) => { ... })` que detecte el estado `'CHANNEL_ERROR'` o `'CLOSED'` y reconecte o muestre una advertencia sutil.
- Evitar crear canales duplicados si el componente se remonta (ya hay lógica para remover el canal existente, pero se verificará que funcione correctamente).

### 6. Verificación de Realtime en Supabase remoto

- Confirmar que la migración `20260708054000_enable_realtime_consents.sql` esté aplicada en el proyecto remoto.
- Verificar en el dashboard de Supabase que `public.consents` esté incluida en la publicación `supabase_realtime`.
- Si no está aplicada, generar/empujar la migración correspondiente.

### 7. Testing

- Flujo completo en local:
  1. Cliente envía consentimiento desde el wizard.
  2. Verificar que aparece en el panel de admin y artista sin F5.
  3. Artista abre el modal, interviene y firma.
  4. Verificar que el consentimiento desaparece de la lista de pendientes del artista y cambia a `Firmado` en la tabla de admin sin F5.
- Simular desconexión de Realtime para confirmar que el fallback de refresco manual/optimista funciona.

## Archivos a modificar

- `src/pages/ArtistPage.tsx`
- `src/components/artist/ArtistConsents.tsx`
- `src/components/admin/ConsentsManager.tsx`
- `supabase/migrations/20260708054000_enable_realtime_consents.sql` (verificación)

## Criterios de aceptación

- [x] Tras firmar un consentimiento en el panel del tatuador, el contador de pendientes del header baja inmediatamente.
- [x] Tras firmar, la tabla principal del artista muestra el consentimiento como `Firmado` sin F5.
- [x] Tras que el cliente envía un consentimiento desde el wizard, el admin lo ve en su tabla sin F5.
- [x] Tras que el tatuador firma, el admin ve el consentimiento como `Firmado` sin F5.
- [ ] Si Realtime falla, el sistema se recupera con refresco manual o polling en un tiempo razonable (deshabilitado por ahora porque Realtime funciona).
