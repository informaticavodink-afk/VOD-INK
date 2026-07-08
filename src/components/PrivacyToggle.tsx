/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { usePrivacyMode } from '@/src/providers/PrivacyModeProvider';
import { Eye, EyeOff } from 'lucide-react';

export default function PrivacyToggle() {
  const { privacyMode, togglePrivacy } = usePrivacyMode();

  return (
    <button
      type="button"
      onClick={togglePrivacy}
      className={`p-2 rounded-xl transition-all duration-200 cursor-pointer focus:outline-none ${
        privacyMode
          ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50'
          : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50'
      }`}
      title={privacyMode ? 'Desactivar privacidad (información pixelada)' : 'Activar privacidad (pixelar información)'}
      aria-label={privacyMode ? 'Desactivar privacidad' : 'Activar privacidad'}
    >
      {privacyMode ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  );
}
