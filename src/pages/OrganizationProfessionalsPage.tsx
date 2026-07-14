/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOrganizationContext } from '@/src/providers/OrganizationProvider';
import OrganizationLayout from '@/src/components/layouts/OrganizationLayout';
import ArtistsManager from '@/src/components/admin/ArtistsManager';

export default function OrganizationProfessionalsPage() {
  const { organization } = useOrganizationContext();

  if (!organization) {
    return (
      <OrganizationLayout>
        <div className="text-center py-12 text-zinc-500">Cargando empresa...</div>
      </OrganizationLayout>
    );
  }

  return (
    <OrganizationLayout>
      <ArtistsManager studioId={organization.id} />
    </OrganizationLayout>
  );
}
