// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import type { ReactNode } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ArtistLayout from './ArtistLayout';

vi.mock('@/utils/supabase/client', () => ({ createClient: vi.fn() }));

vi.mock('@/src/components/SensitiveText', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('@/src/components/PrivacyToggle', () => ({ default: () => null }));

vi.mock('@/src/components/Branding', () => ({ default: () => null }));

afterEach(cleanup);

describe('ArtistLayout scroll region', () => {
  it('makes its root the scrolling region so the panel content can be reached', () => {
    const { container } = render(
      <ArtistLayout
        profile={{ full_name: 'Tatuador Sintetico' } as never}
        artist={null}
        pendingConsents={[]}
        activeFilter="all"
        onShowAllConsents={vi.fn()}
        onShowPendingSignatureConsents={vi.fn()}
        onInterveneConsent={vi.fn()}
      >
        <div>Contenido del panel</div>
      </ArtistLayout>,
    );

    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass('wizard-scroll-region');
    expect(root).toHaveClass('h-[100dvh]');
  });
});
