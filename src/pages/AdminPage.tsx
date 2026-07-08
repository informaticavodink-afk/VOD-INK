/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import { useProfile } from '@/src/hooks/useProfile';
import LoginForm from '@/src/components/admin/LoginForm';
import AdminLayout from '@/src/components/admin/AdminLayout';
import ArtistsManager from '@/src/components/admin/ArtistsManager';
import ConsentsManager from '@/src/components/admin/ConsentsManager';
import { Loader2 } from 'lucide-react';

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id);
  const [activeTab, setActiveTab] = useState<'artists' | 'consents'>('artists');

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  if (profile?.role === 'artist') {
    return <Navigate to="/artist" replace />;
  }

  if (profile?.role !== 'owner') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-6">
        <div className="max-w-sm w-full bg-white border border-red-100 p-6 rounded-2xl shadow-xl text-center">
          <h2 className="font-sans font-extrabold text-lg text-red-900">Acceso restringido</h2>
          <p className="font-sans text-sm text-red-700 mt-2">
            No tienes permisos de propietario para acceder a este panel.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout profile={profile} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'artists' && <ArtistsManager studioId={profile.studio_id} />}
      {activeTab === 'consents' && <ConsentsManager studioId={profile.studio_id} />}
    </AdminLayout>
  );
}
