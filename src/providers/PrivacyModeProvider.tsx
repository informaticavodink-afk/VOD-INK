/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

interface PrivacyModeContextType {
  privacyMode: boolean;
  togglePrivacy: () => void;
  enablePrivacy: () => void;
  disablePrivacy: () => void;
}

const PrivacyModeContext = createContext<PrivacyModeContextType | undefined>(undefined);

export function PrivacyModeProvider({ children }: { children: React.ReactNode }) {
  const [privacyMode, setPrivacyMode] = useState(false);

  const togglePrivacy = useCallback(() => setPrivacyMode((prev) => !prev), []);
  const enablePrivacy = useCallback(() => setPrivacyMode(true), []);
  const disablePrivacy = useCallback(() => setPrivacyMode(false), []);

  return (
    <PrivacyModeContext.Provider value={{ privacyMode, togglePrivacy, enablePrivacy, disablePrivacy }}>
      {children}
    </PrivacyModeContext.Provider>
  );
}

export function usePrivacyMode() {
  const context = useContext(PrivacyModeContext);
  if (!context) {
    throw new Error('usePrivacyMode must be used within PrivacyModeProvider');
  }
  return context;
}
