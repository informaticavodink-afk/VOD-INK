/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PrivacyModeProvider } from '@/src/providers/PrivacyModeProvider';
import WizardPage from './pages/WizardPage';
import AdminPage from './pages/AdminPage';
import ArtistPage from './pages/ArtistPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <PrivacyModeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WizardPage />} />
          <Route path="/consent" element={<WizardPage />} />
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="/artist/*" element={<ArtistPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </PrivacyModeProvider>
  );
}
