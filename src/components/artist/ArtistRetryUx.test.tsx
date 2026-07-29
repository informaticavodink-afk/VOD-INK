// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ArtistConsents from './ArtistConsents';
import InterventionModal from './InterventionModal';

const consentsHarness = vi.hoisted(() => {
  const pending = {
    id: 'consent-card-retry',
    status: 'pending_artist',
    created_at: '2026-07-28T00:00:00.000Z',
    client_full_name: 'Cliente Card Pendiente',
    client_dni: 'DNI-CARD-RETRY',
  };
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn().mockResolvedValue({ data: [pending], error: null }),
  };
  const channel: any = {
    on: vi.fn(() => channel),
    subscribe: vi.fn(() => channel),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
  };
  const client = {
    from: vi.fn(() => query),
    getChannels: vi.fn(() => []),
    removeChannel: vi.fn(),
    channel: vi.fn(() => channel),
  };
  return { client, pending };
});

vi.mock('@/utils/supabase/client', () => ({ createClient: () => consentsHarness.client }));

vi.mock('../SensitiveText', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../SignaturePad', () => ({
  default: ({ onSave }: { onSave: (signature: string) => void }) => (
    <button type="button" onClick={() => onSave('data:image/png;base64,iVBORw0KGgoFIRMA')}>
      Guardar firma de prueba
    </button>
  ),
}));

vi.mock('../DatePicker', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <input aria-label="Caducidad" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

afterEach(cleanup);

const HEALTH_MESSAGE =
  'Faltan datos sanitarios verificados del estudio. Solicita su actualización y vuelve a intentar finalizar este mismo consentimiento.';
const consent = {
  id: 'consent-retry-synthetic',
  client_full_name: 'Cliente Retry Sintético',
  client_dni: 'DNI-RETRY-001',
  health_flags: [],
  technique_data: {
    denominacionGenerica: 'Tatuaje',
    localizacionAnatomica: 'Antebrazo izquierdo',
    tintas: [{ nombre: 'Negro prueba', numRegistroAEMPS: 'AEMPS-RETRY', lote: 'LOTE-RETRY', caducidad: '2029-01-01' }],
    otrosMateriales: 'Material estéril sintético',
    duracion: 'Dos horas',
    posibilidadesEliminacion: 'Tratamiento láser',
    presupuesto: '200 EUR',
  },
};
const artist = { full_name: 'Artista Retry Sintético', dni: 'DNI-ARTIST-001', qualification: 'Técnico homologado' };
const healthError = { code: 'STUDIO_HEALTH_UNVERIFIED', status: 409, message: HEALTH_MESSAGE, retryable: true };

function renderModalWith(
  error: unknown,
  onSave = vi.fn().mockResolvedValue(undefined),
  onClose = vi.fn(),
  isOpen = true,
  consentValue = consent,
) {
  return render(
    <InterventionModal
      isOpen={isOpen}
      onClose={onClose}
      consent={consentValue}
      artist={artist}
      onSave={onSave}
      isSaving={false}
      error={error as never}
    />,
  );
}

function renderModal(error: unknown, onSave = vi.fn().mockResolvedValue(undefined)) {
  renderModalWith(error, onSave);
  return onSave;
}

describe('Artist retry UX', () => {
  it('mantiene el consentimiento pendiente, muestra el mensaje sanitario exacto y reusa la firma actual', async () => {
    const user = userEvent.setup();
    const onSave = renderModal(healthError);

    expect(screen.getByText('Cliente Retry Sintético')).toBeVisible();
    expect(screen.getByText(HEALTH_MESSAGE)).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Guardar firma de prueba' }));
    await user.click(screen.getByRole('button', { name: /reintentar finalización/i }));

    expect(onSave).toHaveBeenCalledWith(consent.technique_data, 'data:image/png;base64,iVBORw0KGgoFIRMA');
  });

  it.each([
    [healthError, HEALTH_MESSAGE, true],
    [{ code: 'FINALIZATION_RETRYABLE', status: 503, message: 'Error de carga sintético', retryable: true }, 'Error de carga sintético', true],
    [{ code: 'FINALIZATION_CONTENT_CONFLICT', status: 409, message: 'Conflicto de contenido sintético', retryable: false }, 'Conflicto de contenido sintético', false],
    [{ status: 500, message: 'Error interno sintético' }, 'Error interno sintético', false],
    [{ status: 401, message: 'No autenticado' }, 'No autenticado', false],
    [{ status: 403, message: 'Sin permisos' }, 'Sin permisos', false],
  ])('distingue errores retryables y bloqueos no retryables (%o)', async (error, message, hasRetry) => {
    renderModal(error);

    expect(screen.getByRole('alert')).toHaveTextContent(message);
    if (hasRetry) {
      expect(screen.getByRole('button', { name: /reintentar finalización/i })).toBeVisible();
    } else {
      expect(screen.queryByRole('button', { name: /reintentar finalización/i })).not.toBeInTheDocument();
    }
  });

  it('permite repetir un bloqueo sin cambiar el consentimiento ni la firma', async () => {
    const user = userEvent.setup();
    const onSave = renderModal(healthError);

    await user.click(screen.getByRole('button', { name: 'Guardar firma de prueba' }));
    await user.click(screen.getByRole('button', { name: /reintentar finalización/i }));
    await user.click(screen.getByRole('button', { name: /reintentar finalización/i }));

    expect(onSave).toHaveBeenCalledTimes(2);
    expect(onSave).toHaveBeenNthCalledWith(1, consent.technique_data, 'data:image/png;base64,iVBORw0KGgoFIRMA');
    expect(onSave).toHaveBeenNthCalledWith(2, consent.technique_data, 'data:image/png;base64,iVBORw0KGgoFIRMA');
  });

  it('preserva el contexto al cerrar y volver a abrir el modal', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderModalWith(healthError, vi.fn(), onClose);

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(onClose).toHaveBeenCalledOnce();

    cleanup();
    renderModalWith(healthError);
    expect(screen.getByText('Cliente Retry Sintético')).toBeVisible();
    expect(screen.getByText(HEALTH_MESSAGE)).toBeVisible();
  });

  it('no pierde la firma cuando se refresca la técnica del mismo consentimiento', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const view = renderModalWith(healthError, onSave);

    await user.click(screen.getByRole('button', { name: 'Guardar firma de prueba' }));
    view.rerender(
      <InterventionModal
        isOpen
        onClose={vi.fn()}
        consent={{ ...consent, technique_data: { ...consent.technique_data, presupuesto: '250 EUR' } }}
        artist={artist}
        onSave={onSave}
        isSaving={false}
        error={healthError as never}
      />,
    );
        await user.click(screen.getByRole('button', { name: /reintentar finalización/i }));

        expect(onSave).toHaveBeenCalledWith(
          { ...consent.technique_data, presupuesto: '250 EUR' },
          'data:image/png;base64,iVBORw0KGgoFIRMA',
        );
      });

      it('renders the pending artist card and preserves its status for intervention', async () => {
        const onInterveneConsent = vi.fn();
        render(
          <ArtistConsents
            artistId="artist-card-retry"
            artist={null}
            statusFilter="pending_signature"
            onStatusFilterChange={vi.fn()}
            onPreviewConsent={vi.fn()}
            onInterveneConsent={onInterveneConsent}
          />,
        );

        await waitFor(() => expect(screen.getByText('Cliente Card Pendiente')).toBeVisible());
        expect(screen.getByText('Pendiente de firma')).toBeVisible();
        await userEvent.setup().click(screen.getByRole('button', { name: 'Firmar intervención y consentimiento' }));
        expect(onInterveneConsent).toHaveBeenCalledWith(expect.objectContaining({
          id: 'consent-card-retry',
          status: 'pending_artist',
        }));
      });
    });
