// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../components/SignaturePad', () => ({ default: ({ placeholderText }: { placeholderText: string }) => <div>{placeholderText}</div> }));

import Step6SignatureClient from './Step6_SignatureClient';
import { PrivacyModeProvider } from '../providers/PrivacyModeProvider';

const client = { nombreYApellidos: 'Cliente Sintético', dni: '12345678Z', fechaNacimiento: '2000-01-01', domicilio: 'Calle Uno 1', cp: '39001', localidad: 'Santander', telefono: '600000000' };
const representative = { nombreYApellidos: 'Representante Sintético', dni: '87654321X', fechaNacimiento: '1970-01-01', domicilio: 'Calle Dos 2', cp: '39002', localidad: 'Santander', telefono: '611111111', parentesco: 'MADRE', acreditaMediante: 'DNI_AMBOS' };

function renderSignature(tieneRepresentanteLegal: boolean) {
  return render(
    <PrivacyModeProvider><Step6SignatureClient
      datosCliente={client}
      datosRepresentante={representative}
      tieneRepresentanteLegal={tieneRepresentanteLegal}
      firmaCliente=""
      onUpdate={vi.fn()}
      triggerValidationRef={{ current: null }}
    /></PrivacyModeProvider>,
  );
}

describe('Step6 representation attribution', () => {
  afterEach(cleanup);

  it('attributes the sole signature to the representative when represented', () => {
    renderSignature(true);
    expect(screen.getByText('Representante Sintético')).toBeTruthy();
    expect(screen.getByText(/Firma del Representante Legal/)).toBeTruthy();
    expect(screen.queryByText('Cliente Sintético')).toBeNull();
  });

  it('attributes the signature to the client when unrepresented', () => {
    renderSignature(false);
    expect(screen.getByText('Cliente Sintético')).toBeTruthy();
    expect(screen.getByText('Firma de la Persona Usuaria (Cliente)')).toBeTruthy();
    expect(screen.queryByText('Representante Sintético')).toBeNull();
  });
});
