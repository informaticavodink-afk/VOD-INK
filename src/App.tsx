/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PrivacyModeProvider } from '@/src/providers/PrivacyModeProvider';
import { OrganizationProvider } from '@/src/providers/OrganizationProvider';
import WizardPage from './pages/WizardPage';
import AdminPage from './pages/AdminPage';
import ArtistPage from './pages/ArtistPage';
import OrganizationDashboardPage from './pages/OrganizationDashboardPage';
import OrganizationProfessionalsPage from './pages/OrganizationProfessionalsPage';
import OrganizationConsentsPage from './pages/OrganizationConsentsPage';
import OrganizationSettingsPage from './pages/OrganizationSettingsPage';
import ProfessionalDashboardPage from './pages/ProfessionalDashboardPage';
import SuperAdminPage from './pages/SuperAdminPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <PrivacyModeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WizardPage />} />
          <Route path="/consent" element={<WizardPage />} />

          {/* Legacy routes kept during transition */}
          <Route path="/admin/*" element={<AdminPage />} />
          <Route path="/artist/*" element={<ArtistPage />} />

          {/* Organization admin routes */}
          <Route
            path="/app/:organizationSlug"
            element={<OrganizationProvider />}
          >
            <Route path="dashboard" element={<OrganizationDashboardPage />} />
            <Route path="professionals" element={<OrganizationProfessionalsPage />} />
            <Route path="consents" element={<OrganizationConsentsPage />} />
            <Route path="settings" element={<OrganizationSettingsPage />} />
          </Route>

          {/* Professional routes */}
          <Route
            path="/professional/:organizationSlug"
            element={<OrganizationProvider />}
          >
            <Route path="*" element={<ProfessionalDashboardPage />} />
          </Route>

          {/* Super admin */}
          <Route path="/super-admin" element={<SuperAdminPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </PrivacyModeProvider>
  );
}
