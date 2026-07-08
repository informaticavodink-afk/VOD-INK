/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { usePrivacyMode } from '@/src/providers/PrivacyModeProvider';

interface SensitiveTextProps {
  children: React.ReactNode;
  className?: string;
}

export default function SensitiveText({ children, className = '' }: SensitiveTextProps) {
  const { privacyMode } = usePrivacyMode();
  return (
    <span
      className={`inline-block transition-all duration-200 ${
        privacyMode ? 'blur-[4px] select-none' : ''
      } ${className}`}
      aria-hidden={privacyMode ? true : undefined}
    >
      {children}
    </span>
  );
}
