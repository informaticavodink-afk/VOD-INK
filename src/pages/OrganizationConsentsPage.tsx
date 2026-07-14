/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useOrganizationContext } from '@/src/providers/OrganizationProvider';
import OrganizationLayout from '@/src/components/layouts/OrganizationLayout';
import ConsentsManager from '@/src/components/admin/ConsentsManager';

export default function OrganizationConsentsPage() {
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
      <ConsentsManager studioId={organization.id} />
    </OrganizationLayout>
  );
}
