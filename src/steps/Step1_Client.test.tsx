// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Cliente, RepresentanteLegal } from '../types';

vi.mock('../components/DatePicker', () => ({
  default: ({
    value,
    onChange,
    dark,
  }: {
    value: string;
    onChange: (value: string) => void;
    dark?: boolean;
  }) => (
    <input
      aria-label={dark ? 'Representative birth date' : 'Client birth date'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

import Step1Client from './Step1_Client';

const CLIENT: Cliente = {
  nombreYApellidos: 'Cliente Sintético',
  dni: '12345678Z',
  fechaNacimiento: '',
  domicilio: 'Calle Uno 1',
  cp: '39001',
  localidad: 'Santander',
  telefono: '600000000',
};

const REPRESENTATIVE: RepresentanteLegal = {
  nombreYApellidos: 'Representante Sintético',
  dni: '87654321X',
  fechaNacimiento: '',
  domicilio: 'Calle Dos 2',
  cp: '39002',
  localidad: 'Santander',
  telefono: '',
  parentesco: 'MADRE',
  acreditaMediante: 'DNI_AMBOS',
};

const EMPTY_REPRESENTATIVE: RepresentanteLegal = {
  nombreYApellidos: '',
  dni: '',
  fechaNacimiento: '',
  domicilio: '',
  cp: '',
  localidad: '',
  telefono: '',
  parentesco: '',
  acreditaMediante: '',
};

function madridToday() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date())
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value]),
  );
  return { year: Number(parts.year), month: parts.month, day: parts.day };
}

function birthDateForAge(age: number) {
  const today = madridToday();
  return `${today.year - age}-${today.month}-${today.day}`;
}

function renderStep1(overrides: Partial<{
  datosCliente: Cliente;
  datosRepresentante: RepresentanteLegal;
  tieneRepresentanteLegal: boolean;
  esMenor: boolean;
}> = {}) {
  const triggerValidationRef = { current: null as (() => Promise<boolean>) | null };
  const saveStateRef = { current: null as (() => void) | null };
  const onUpdate = vi.fn();
  render(
    <Step1Client
      datosCliente={{ ...CLIENT, fechaNacimiento: birthDateForAge(20), ...overrides.datosCliente }}
      datosRepresentante={overrides.datosRepresentante ?? EMPTY_REPRESENTATIVE}
      esMenor={overrides.esMenor ?? false}
      tieneRepresentanteLegal={overrides.tieneRepresentanteLegal ?? false}
      onUpdate={onUpdate}
      triggerValidationRef={triggerValidationRef}
      saveStateRef={saveStateRef}
    />,
  );
  return { onUpdate, triggerValidationRef, saveStateRef };
}

function fillRepresentative() {
  fireEvent.change(screen.getByPlaceholderText('ej. María García López'), {
    target: { value: REPRESENTATIVE.nombreYApellidos },
  });
  fireEvent.change(screen.getByPlaceholderText('ej. 87654321Z'), {
    target: { value: REPRESENTATIVE.dni },
  });
  fireEvent.change(screen.getByLabelText('Representative birth date'), {
    target: { value: birthDateForAge(40) },
  });
  fireEvent.change(screen.getByPlaceholderText('ej. Calle Vargas 45, Santander'), {
    target: { value: REPRESENTATIVE.domicilio },
  });
  fireEvent.change(screen.getAllByPlaceholderText('39010')[1], {
    target: { value: REPRESENTATIVE.cp },
  });
  fireEvent.change(screen.getAllByPlaceholderText('Santander')[1], {
    target: { value: REPRESENTATIVE.localidad },
  });
  const selects = screen.getAllByRole('combobox');
  fireEvent.change(selects[0], { target: { value: REPRESENTATIVE.parentesco } });
  fireEvent.change(selects[1], { target: { value: REPRESENTATIVE.acreditaMediante } });
  fireEvent.change(screen.getByPlaceholderText('ej. 600987654'), {
    target: { value: '611111111' },
  });
}

describe('Step1 representation interactions', () => {
  afterEach(cleanup);

  it('forces representation for minors and disables the opt-out control', () => {
    renderStep1({ datosCliente: { ...CLIENT, fechaNacimiento: birthDateForAge(17) } });

    expect(screen.getByText(/El usuario es menor de edad/)).toBeTruthy();
    expect(screen.getByText('Representante Legal (Obligatorio)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Representante legal' })).toHaveProperty('disabled', true);
  });

  it('forces representation for a client whose computed age is zero', () => {
    renderStep1({ datosCliente: { ...CLIENT, fechaNacimiento: birthDateForAge(0) } });

    expect(screen.getByText(/El usuario es menor de edad/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Representante legal' })).toHaveProperty('disabled', true);
  });

  it('allows adult opt-in and clears representative fields on opt-out', async () => {
    const { onUpdate, saveStateRef } = renderStep1();
    const toggle = screen.getByRole('button', { name: 'Representante legal' });

    fireEvent.click(toggle);
    fillRepresentative();
    await act(async () => saveStateRef.current?.());
    expect(onUpdate.mock.lastCall?.[0]).toMatchObject({
      tieneRepresentanteLegal: true,
      datosRepresentante: expect.objectContaining({ nombreYApellidos: REPRESENTATIVE.nombreYApellidos }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Representante legal' }));
    expect(screen.queryByText('Representante Legal (Obligatorio)')).toBeNull();
    await act(async () => saveStateRef.current?.());
    expect(onUpdate.mock.lastCall?.[0]).toMatchObject({
      tieneRepresentanteLegal: false,
      datosRepresentante: EMPTY_REPRESENTATIVE,
    });
  });

  it('persists adult opt-out and clears stale fields through the navigation ref', async () => {
    const { onUpdate, saveStateRef } = renderStep1({
      datosRepresentante: { ...REPRESENTATIVE, fechaNacimiento: birthDateForAge(40), telefono: '611111111' },
      tieneRepresentanteLegal: true,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Representante legal' }));
    await act(async () => saveStateRef.current?.());
    expect(onUpdate.mock.lastCall?.[0]).toMatchObject({
      tieneRepresentanteLegal: false,
      datosRepresentante: EMPTY_REPRESENTATIVE,
    });
  });

  it('updates representation when the client crosses the adult boundary in either direction', () => {
    renderStep1({ datosCliente: { ...CLIENT, fechaNacimiento: birthDateForAge(18) } });
    const clientBirthDate = screen.getByLabelText('Client birth date');

    fireEvent.change(clientBirthDate, { target: { value: birthDateForAge(17) } });
    expect(screen.getByRole('button', { name: 'Representante legal' })).toHaveProperty('disabled', true);
    expect(screen.getByText('Representante Legal (Obligatorio)')).toBeTruthy();

    fireEvent.change(clientBirthDate, { target: { value: birthDateForAge(18) } });
    expect(screen.getByRole('button', { name: 'Representante legal' })).toHaveProperty('disabled', false);
    expect(screen.getByText('Representante Legal (Obligatorio)')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Representante legal' }));
    expect(screen.queryByText('Representante Legal (Obligatorio)')).toBeNull();
    fireEvent.change(clientBirthDate, { target: { value: birthDateForAge(17) } });
    expect(screen.getByRole('button', { name: 'Representante legal' })).toHaveProperty('disabled', true);
    expect(screen.getByText('Representante Legal (Obligatorio)')).toBeTruthy();
  });

  it('validates representative birth date and phone only when represented', async () => {
    const { triggerValidationRef } = renderStep1({
      tieneRepresentanteLegal: true,
      datosRepresentante: REPRESENTATIVE,
    });

    let valid = true;
    await act(async () => {
      valid = (await triggerValidationRef.current?.()) ?? false;
    });
    expect(valid).toBe(false);
    expect(screen.getByText('El representante legal debe ser mayor de edad')).toBeTruthy();
    expect(screen.getByText('Teléfono de 9 dígitos no válido')).toBeTruthy();
  });

  it('skips representative validation and persists null-equivalent data when unrepresented', async () => {
    const { onUpdate, triggerValidationRef } = renderStep1({
      datosRepresentante: REPRESENTATIVE,
      tieneRepresentanteLegal: false,
    });

    let valid = false;
    await act(async () => {
      valid = (await triggerValidationRef.current?.()) ?? false;
    });
    expect(valid).toBe(true);
    expect(onUpdate.mock.lastCall?.[0]).toMatchObject({
      tieneRepresentanteLegal: false,
      datosRepresentante: EMPTY_REPRESENTATIVE,
    });
  });

  it('saves the latest representation state through the navigation ref', async () => {
    const { onUpdate, saveStateRef } = renderStep1({
      datosRepresentante: EMPTY_REPRESENTATIVE,
      tieneRepresentanteLegal: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Representante legal' }));
    fireEvent.change(screen.getByPlaceholderText('ej. María García López'), {
      target: { value: 'Tutor Sintético' },
    });
    await act(async () => saveStateRef.current?.());

    expect(onUpdate.mock.lastCall?.[0]).toMatchObject({
      tieneRepresentanteLegal: true,
      datosRepresentante: expect.objectContaining({ nombreYApellidos: 'Tutor Sintético' }),
    });
  });
});
