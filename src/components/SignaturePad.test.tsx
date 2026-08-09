// @vitest-environment jsdom

import React from 'react';
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignaturePad, { scaleStrokeData } from './SignaturePad';

const mocks = vi.hoisted(() => {
  const instances: Array<Record<string, any>> = [];
  class Pad {
    data: any[] = [];
    listeners = new Map<string, () => void>();
    toData = vi.fn(() => this.data);
    fromData = vi.fn((data: any[]) => { this.data = data; });
    isEmpty = vi.fn(() => this.data.length === 0);
    toDataURL = vi.fn(() => 'data:image/png;base64,SAVED');
    clear = vi.fn(() => { this.data = []; });
    addEventListener = vi.fn((name: string, listener: () => void) => this.listeners.set(name, listener));
    removeEventListener = vi.fn((name: string) => this.listeners.delete(name));
    off = vi.fn();
    constructor() { instances.push(this); }
  }
  return { instances, Pad };
});
vi.mock('signature_pad', () => ({ default: mocks.Pad }));

let bounds = { width: 300, height: 240 };
let resizeCallbacks: Array<() => void> = [];
const disconnect = vi.fn();
const setTransform = vi.fn();

class ResizeObserverMock {
  constructor(callback: () => void) { resizeCallbacks.push(callback); }
  observe = vi.fn();
  disconnect = disconnect;
}

function pad() {
  return mocks.instances.at(-1)!;
}
function resize(next: { width: number; height: number }, ratio = window.devicePixelRatio) {
  bounds = next;
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: ratio });
  act(() => resizeCallbacks.forEach((callback) => callback()));
}

function resizeFromObserverAndWindow(next: { width: number; height: number }, ratio: number) {
  bounds = next;
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: ratio });
  act(() => {
    resizeCallbacks.forEach((callback) => callback());
    window.dispatchEvent(new Event('resize'));
  });
}

beforeEach(() => {
  mocks.instances.length = 0;
  resizeCallbacks = [];
  bounds = { width: 300, height: 240 };
  disconnect.mockClear();
  setTransform.mockClear();
  Object.defineProperty(window, 'devicePixelRatio', { configurable: true, value: 2 });
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
    ...bounds, x: 0, y: 0, top: 0, left: 0, right: bounds.width, bottom: bounds.height, toJSON: () => ({}),
  }));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ setTransform } as unknown as CanvasRenderingContext2D);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('SignaturePad resize behavior', () => {
  it('uses stable dimensions and the current DPR transform', () => {
    const { container } = render(<SignaturePad onSave={vi.fn()} onClear={vi.fn()} />);
    const canvas = container.querySelector('canvas')!;
    expect(container.firstElementChild).toHaveClass('min-h-[240px]', 'sm:min-h-[280px]');
    expect(canvas.style.width).toBe('300px');
    expect(canvas.style.height).toBe('240px');
    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(480);
    expect(setTransform).toHaveBeenLastCalledWith(2, 0, 0, 2, 0, 0);
  });

  it('preserves multiple strokes and their metadata across proportional resize', () => {
    const onClear = vi.fn();
    render(<SignaturePad onSave={vi.fn()} onClear={onClear} />);
    pad().data = [
      { color: 'black', minWidth: 1.5, points: [{ x: 10, y: 20, pressure: 0.5, time: 123 }] },
      { color: 'blue', maxWidth: 4.5, points: [{ x: 30, y: 40, pressure: 0.8, time: 456 }] },
    ];

    resize({ width: 600, height: 120 });

    expect(pad().toData).toHaveBeenCalled();
    expect(pad().fromData).toHaveBeenCalledWith([
      { color: 'black', minWidth: 1.5, points: [{ x: 20, y: 10, pressure: 0.5, time: 123 }] },
      { color: 'blue', maxWidth: 4.5, points: [{ x: 60, y: 20, pressure: 0.8, time: 456 }] },
    ]);
    expect(pad().clear).not.toHaveBeenCalled();
    expect(onClear).not.toHaveBeenCalled();
  });

  it('preserves strokes through portrait to landscape to portrait', () => {
    bounds = { width: 300, height: 500 };
    render(<SignaturePad onSave={vi.fn()} onClear={vi.fn()} />);
    const original = [{ color: 'black', points: [{ x: 60, y: 100, pressure: 0.6, time: 789 }] }];
    pad().data = original;
    pad().fromData.mockClear();

    resize({ width: 500, height: 300 });
    expect(pad().fromData).toHaveBeenLastCalledWith([
      { color: 'black', points: [{ x: 100, y: 60, pressure: 0.6, time: 789 }] },
    ]);

    resize({ width: 300, height: 500 });
    expect(pad().fromData).toHaveBeenCalledTimes(2);
    expect(pad().fromData).toHaveBeenLastCalledWith(original);
    expect(pad().data).toEqual(original);
  });

  it('coalesces combined resize and DPR notifications into exactly one preserved redraw', () => {
    render(<SignaturePad onSave={vi.fn()} onClear={vi.fn()} />);
    pad().data = [{ color: 'black', points: [{ x: 30, y: 40, pressure: 0.7, time: 321 }] }];
    pad().toData.mockClear();
    pad().fromData.mockClear();
    setTransform.mockClear();

    resizeFromObserverAndWindow({ width: 450, height: 360 }, 3);

    expect(pad().toData).toHaveBeenCalledTimes(1);
    expect(pad().fromData).toHaveBeenCalledTimes(1);
    expect(pad().fromData).toHaveBeenCalledWith([
      { color: 'black', points: [{ x: 45, y: 60, pressure: 0.7, time: 321 }] },
    ]);
    expect(pad().data).toEqual([
      { color: 'black', points: [{ x: 45, y: 60, pressure: 0.7, time: 321 }] },
    ]);
    expect(setTransform).toHaveBeenCalledTimes(1);
    expect(setTransform).toHaveBeenCalledWith(3, 0, 0, 3, 0, 0);
  });

  it('guards zero and unchanged measurements while redrawing once for a DPR-only change', () => {
    render(<SignaturePad onSave={vi.fn()} onClear={vi.fn()} />);
    pad().data = [{ points: [{ x: 1, y: 2 }] }];
    pad().toData.mockClear();
    pad().fromData.mockClear();

    resize({ width: 300, height: 240 }, 2);
    resize({ width: 0, height: 240 }, 2);
    expect(pad().toData).not.toHaveBeenCalled();

    resize({ width: 300, height: 240 }, 3);
    expect(pad().toData).toHaveBeenCalledTimes(1);
    expect(pad().fromData).toHaveBeenCalledTimes(1);
    expect(setTransform).toHaveBeenLastCalledWith(3, 0, 0, 3, 0, 0);
  });

  it('continues drawing after resize and cleans up all listeners', () => {
    const onSave = vi.fn();
    const { unmount } = render(<SignaturePad onSave={onSave} onClear={vi.fn()} />);
    const instance = pad();
    resize({ width: 500, height: 300 });
    instance.data = [{ points: [{ x: 5, y: 6 }] }];
    act(() => instance.listeners.get('endStroke')?.());
    const confirm = screen.getByRole('button', { name: /confirmar/i });
    expect(confirm).toBeEnabled();
    fireEvent.click(confirm);
    expect(onSave).toHaveBeenCalledWith('data:image/png;base64,SAVED');

    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    expect(instance.removeEventListener).toHaveBeenCalledWith('endStroke', expect.any(Function));
    expect(instance.off).toHaveBeenCalledOnce();
  });

  it('declares 44px minimum dimensions on capture and preview controls', () => {
    const { rerender } = render(<SignaturePad onSave={vi.fn()} onClear={vi.fn()} />);
    for (const name of [/borrar firma/i, /confirmar/i]) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveClass('min-h-[44px]', 'min-w-[44px]');
      expect(button.getAttribute('class')).toContain('min-h-[44px]');
      expect(button.getAttribute('class')).toContain('min-w-[44px]');
    }
    rerender(<SignaturePad initialDataUrl="data:image/png;base64,OLD" onSave={vi.fn()} onClear={vi.fn()} onConfirmSubmit={vi.fn()} />);
    for (const name of [/volver a firmar/i, /confirmar y enviar/i]) {
      const button = screen.getByRole('button', { name });
      expect(button).toHaveClass('min-h-[44px]', 'min-w-[44px]');
      expect(button.getAttribute('class')).toContain('min-h-[44px]');
      expect(button.getAttribute('class')).toContain('min-w-[44px]');
    }
  });

  it('scales points without dropping stroke metadata', () => {
    expect(scaleStrokeData([{ color: 'black', points: [{ x: 2, y: 4, pressure: 0.7 }] }], 2, 0.5)).toEqual([
      { color: 'black', points: [{ x: 4, y: 2, pressure: 0.7 }] },
    ]);
  });
});
