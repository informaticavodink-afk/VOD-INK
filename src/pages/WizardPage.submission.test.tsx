// @vitest-environment jsdom

import type React from 'react';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import WizardPage from './WizardPage';
import { SubmissionError } from '../lib/submissions';

const { submitConsentToApi, getOrCreateIdempotencyKey } = vi.hoisted(() => ({
  submitConsentToApi: vi.fn(),
  getOrCreateIdempotencyKey: vi.fn(() => 'stable-key'),
}));

vi.mock('../lib/submissions', async (importOriginal) => {
  const original = await importOriginal<typeof import('../lib/submissions')>();
  return { ...original, submitConsentToApi, getOrCreateIdempotencyKey, clearIdempotencyKey: vi.fn() };
});
vi.mock('motion/react', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: { div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div> },
}));
vi.mock('../components/BrandMark', () => ({ default: () => <div /> }));
vi.mock('../components/Header', () => ({ default: () => <div /> }));
vi.mock('../components/StepFooter', () => ({
  default: ({ onNext, canNext }: { onNext: () => void; canNext: boolean }) => (
    <button type="button" onClick={onNext} disabled={!canNext}>Next</button>
  ),
}));
vi.mock('../steps/Step0_Artist', () => ({
  default: ({ onSelect }: { onSelect: (artist: unknown) => void }) => (
    <button type="button" onClick={() => onSelect({ id: 'artist-1', nombreYApellidos: 'Artist' })}>Select artist</button>
  ),
}));
vi.mock('../steps/Step1_Client', () => ({
  default: ({ onUpdate }: { onUpdate: (data: unknown) => void }) => (
    <button type="button" onClick={() => onUpdate({
      datosCliente: { nombreYApellidos: 'Client', dni: 'C-1', fechaNacimiento: '2010-01-01', domicilio: 'Street', cp: '39000', localidad: 'Santander', telefono: '600000000' },
      datosRepresentante: { nombreYApellidos: 'Representative', dni: 'R-1', fechaNacimiento: '1980-01-01', domicilio: 'Street', cp: '39000', localidad: 'Santander', telefono: '611111111', parentesco: 'Mother', acreditaMediante: 'ID' },
      esMenor: true,
      tieneRepresentanteLegal: true,
    })}>Fill represented client</button>
  ),
}));
vi.mock('../steps/Step3_Legal', () => ({ default: ({ onUpdate }: { onUpdate: (value: boolean) => void }) => <button onClick={() => onUpdate(true)}>Accept legal</button> }));
vi.mock('../steps/Step4_Contraindications', () => ({ default: ({ onUpdate }: { onUpdate: (value: unknown) => void }) => <button onClick={() => onUpdate({ declaracionContraindicaciones: true, declaracionSaludSeleccionadas: ['none'] })}>Accept health</button> }));
vi.mock('../steps/Step6_SignatureClient', () => ({
  default: ({ onUpdate, onConfirmSubmit }: { onUpdate: (value: string) => void; onConfirmSubmit: () => void }) => <>
    <button onClick={() => onUpdate('data:image/png;base64,SIGNATURE')}>Sign</button>
    <button onClick={onConfirmSubmit}>Open confirmation</button>
  </>,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function reachConfirmation() {
  const user = userEvent.setup();
  render(<WizardPage />);
  await user.click(screen.getByRole('checkbox'));
  await user.click(screen.getByRole('button', { name: /comenzar/i }));
  await user.click(screen.getByRole('button', { name: 'Select artist' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByRole('button', { name: 'Fill represented client' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByRole('button', { name: 'Accept legal' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByRole('button', { name: 'Accept health' }));
  await user.click(screen.getByRole('button', { name: 'Next' }));
  await user.click(screen.getByRole('button', { name: 'Sign' }));
  await user.click(screen.getByRole('button', { name: 'Open confirmation' }));
  return user;
}

beforeEach(() => {
  submitConsentToApi.mockReset();
  getOrCreateIdempotencyKey.mockClear();
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(cleanup);

describe('WizardPage submission recovery', () => {
  it('prevents synchronous duplicate activation and shows success only after resolution', async () => {
    const request = deferred<{ status: 'signed'; driveFileId: null; driveViewLink: null }>();
    submitConsentToApi.mockReturnValue(request.promise);
    await reachConfirmation();
    const confirm = screen.getByRole('button', { name: 'Confirmar' });

    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(submitConsentToApi).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Envío correcto')).not.toBeInTheDocument();

    await act(() => { request.resolve({ status: 'signed', driveFileId: null, driveViewLink: null }); return request.promise; });
    expect(screen.getByText('Envío correcto')).toBeInTheDocument();
  });

  it('renders safe failure feedback and gates retry by retryability', async () => {
    submitConsentToApi.mockRejectedValueOnce(new SubmissionError('Safe failure', 'SUBMISSION_INVALID', false, 'ref-1'));
    await reachConfirmation();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Safe failure');
    expect(screen.getByRole('alert')).toHaveTextContent('ref-1');
    expect(screen.queryByRole('button', { name: /reintentar/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Envío correcto')).not.toBeInTheDocument();
  });

  it('retries with the same key and preserved client, representative, and signature state', async () => {
    submitConsentToApi
      .mockRejectedValueOnce(new SubmissionError('Try again', 'SUBMISSION_FAILED', true, 'ref-2'))
      .mockResolvedValueOnce({ status: 'signed', driveFileId: null, driveViewLink: null });
    await reachConfirmation();
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await userEvent.click(await screen.findByRole('button', { name: /reintentar/i }));

    expect(submitConsentToApi).toHaveBeenCalledTimes(2);
    const [first, second] = submitConsentToApi.mock.calls.map(([payload]) => payload);
    expect(first.idempotencyKey).toBe('stable-key');
    expect(second.idempotencyKey).toBe(first.idempotencyKey);
    expect(second.state.datosCliente).toEqual(first.state.datosCliente);
    expect(second.state.datosRepresentante).toEqual(first.state.datosRepresentante);
    expect(second.state.firmaCliente).toBe('data:image/png;base64,SIGNATURE');
    expect(second.state.tieneRepresentanteLegal).toBe(true);
    expect(screen.getByText('Envío correcto')).toBeInTheDocument();
  });
});
