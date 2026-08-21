export type StudioSettingsErrorResponse = {
  status: 400 | 401 | 403 | 404;
  body: { error: string };
};

export function toStudioSettingsErrorResponse(error: unknown): StudioSettingsErrorResponse {
  const message = error instanceof Error ? error.message : 'Error interno del servidor';

  if (message === 'No autenticado') {
    return { status: 401, body: { error: 'No autenticado' } };
  }

  if (message.includes('permisos') || message.includes('FORBIDDEN')) {
    return { status: 403, body: { error: 'No tienes permisos para gestionar el estudio' } };
  }

  if (message.includes('No se encontró el estudio')) {
    return { status: 404, body: { error: 'No se encontró el estudio' } };
  }

  return { status: 400, body: { error: 'No se pudo procesar la configuración del estudio' } };
}
