# RDD — Resolución ESM de funciones serverless

## Incidente

El flujo de firma del Preview devolvió errores sucesivos antes de generar el PDF final:

1. el formulario no exponía `posibilidadesEliminacion` aunque el contrato lo exigía;
2. una respuesta `HTTP 500` dejó la técnica persistida y el cliente con estado obsoleto;
3. el reintento volvió a enviar técnica cuando Supabase ya estaba en `pending_artist`;
4. la función de firma falló al iniciar con:

```text
Cannot find module '/var/task/src/domain/consents/consentPdfSchema'
imported from /var/task/src/lib/schema.js
```

## Causa raíz

El proyecto declara `"type": "module"`. Vercel transpila las funciones TypeScript a JavaScript ESM y puede ejecutar ese resultado sin el bundling usado por Vite/esbuild local.

Node ESM no completa extensiones en imports relativos. Este import:

```ts
import { ConsentTechniqueSchema } from '../domain/consents/consentPdfSchema';
```

se conservó como un import sin extensión dentro de `/var/task/src/lib/schema.js`. Node buscó literalmente `consentPdfSchema`, no `consentPdfSchema.js`, y abortó la función antes de entrar al `try/catch` del handler.

## Por qué las verificaciones anteriores no lo detectaron

- Vite, Vitest, `tsx` y esbuild resuelven `.ts`/`.js` y extensiones omitidas durante el bundling.
- `tsconfig.json` usa `moduleResolution: "bundler"`, que permite este patrón.
- Las pruebas validaban contrato, composición, renderer y servicios, pero no ejecutaban el artefacto ESM sin bundler que usa Vercel.
- Un build exitoso de Vercel confirma compilación/despliegue, no que cada función pueda inicializarse en runtime.

## Fallo de diseño relacionado

El frontend trataba cualquier estado distinto de `upload_error` como si aún necesitara guardar técnica. Después de una persistencia exitosa con respuesta interrumpida, el reintento partía de un estado local obsoleto y repetía una transición ya confirmada.

La regla correcta es:

| Estado persistido | Acción permitida |
|---|---|
| `pending_technique` | validar y persistir técnica |
| `pending_artist` | firmar y finalizar sin mutar técnica |
| `upload_error` | reintentar finalización sin mutar técnica |
| `signed` | devolver el final existente |

## Corrección sistémica

1. Todos los imports relativos de runtime del grafo serverless usan extensión `.js` explícita.
2. La ruta de técnica se mantiene aislada del renderer PDF para reducir inicialización y superficie de fallo.
3. La firma carga su módulo dentro del bloque controlado del handler.
4. La UI avanza inmediatamente a `pending_artist` tras persistir técnica.
5. Los reintentos consultan la fase persistida y nunca repiten técnica en `pending_artist` o `upload_error`.

## Guardia de regresión

`server/serverlessEsmResolution.test.ts` añade dos verificaciones que no dependen del bundler:

1. analiza el AST de producción y rechaza imports relativos de runtime sin extensión JavaScript;
2. transpila el grafo serverless a ESM, sin bundling, y pide a Node cargar las entradas de técnica, firma y finalización.

Esta prueba reproduce la semántica que falló en `/var/task` y habría detectado el incidente antes del Preview.

## Criterios de cierre

- Cero imports relativos de runtime sin `.js` en `api`, `server`, `utils` y módulos compartidos alcanzables.
- Artefactos ESM de técnica, firma y finalización cargan en Node sin bundler.
- Máquina de estados cubierta para todas las fases de reintento.
- Lint, suite completa, cobertura y build aprobados.
- E2E del consentimiento sintético termina en `signed` con un único `final_file_id` antes de eliminarlo.
