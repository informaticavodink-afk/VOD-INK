// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import InterventionModal from './InterventionModal';

vi.mock('../SensitiveText', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../SignaturePad', () => ({
  default: ({ onSave }: { onSave: (signature: string) => void }) => (
    <button type="button" onClick={() => onSave('data:image/png;base64,iVBORw0KGgoFIRMA')}>Guardar firma de prueba</button>
  ),
}));

vi.mock('../DatePicker', () => ({
  default: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <input aria-label="Caducidad" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}));

afterEach(cleanup);

const completeTechnique = {
  denominacionGenerica: 'Tatuaje',
  localizacionAnatomica: 'Antebrazo izquierdo',
  tintas: [{ nombre: 'Negro prueba', numRegistroAEMPS: 'AEMPS-TEST', lote: 'LOTE-TEST', caducidad: '2029-01-01' }],
  otrosMateriales: 'Material estéril de prueba',
  duracion: 'Dos horas',
  posibilidadesEliminacion: 'Tratamiento láser especializado',
  presupuesto: '200 EUR',
};

function renderModal(onSave = vi.fn(), technique = completeTechnique) {
  render(
    <InterventionModal
      isOpen
      onClose={vi.fn()}
      consent={{ id: 'consent-test', client_full_name: 'Cliente Test', client_dni: '12345678Z', health_flags: [], technique_data: technique }}
      artist={{ full_name: 'Artista Test', dni: '12345678Z', qualification: 'Técnico homologado' }}
      onSave={onSave}
      isSaving={false}
    />,
  );
  return onSave;
}

describe('InterventionModal', () => {
  it('muestra el campo obligatorio que antes bloqueaba silenciosamente el submit', async () => {
    const user = userEvent.setup();
    renderModal(vi.fn(), { ...completeTechnique, posibilidadesEliminacion: '' });

    const removalInput = screen.getByLabelText('Posibilidades de eliminación');
    expect(removalInput).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Guardar firma de prueba' }));
    await user.click(screen.getByRole('button', { name: /confirmar y firmar/i }));

    expect(await screen.findByText('Posibilidades de eliminación es obligatorio')).toBeVisible();
  });

  it('envía técnica y firma cuando todos los campos visibles son válidos', async () => {
    const user = userEvent.setup();
    const onSave = renderModal();

    await user.click(screen.getByRole('button', { name: 'Guardar firma de prueba' }));
    await user.click(screen.getByRole('button', { name: /confirmar y firmar/i }));

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith(completeTechnique, expect.stringMatching(/^data:image\/png;base64,/));
  });
});
