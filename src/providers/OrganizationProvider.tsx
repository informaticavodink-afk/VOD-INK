/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type React from 'react';
import { createContext, useContext, useMemo } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { useAuth } from '@/src/hooks/useAuth';
import { useProfile } from '@/src/hooks/useProfile';
import { useMemberships } from '@/src/hooks/useMemberships';
import { useOrganization } from '@/src/hooks/useOrganization';
import type { Database } from '@/src/types/supabase';

type Organization = Database['public']['Tables']['organizations']['Row'];
type Membership = Database['public']['Tables']['organization_memberships']['Row'];

type OrgRole = Membership['role'];

interface OrganizationContextValue {
  organizationSlug: string | undefined;
  organization: Organization | null;
  organizationLoading: boolean;
  organizationError: string | null;
  membership: Membership | null;
  memberships: Membership[];
  membershipsLoading: boolean;
  isLoading: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  isArtist: boolean;
  isOwnerOrAdmin: boolean;
  isSuperAdmin: boolean;
  canAccessOrg: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(
  undefined
);

export function OrganizationProvider({ children }: { children?: React.ReactNode }) {
  const { organizationSlug } = useParams<{ organizationSlug?: string }>();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id);
  const {
    organization,
    loading: organizationLoading,
    error: organizationError,
  } = useOrganization(organizationSlug);
  const { memberships, loading: membershipsLoading } = useMemberships(user?.id);

  const isLoading = authLoading || profileLoading || organizationLoading || membershipsLoading;

  const membership = useMemo(() => {
    if (!organization || !memberships.length) return null;
    return (
      memberships.find((m) => m.organization_id === organization.id) || null
    );
  }, [organization, memberships]);

  const isOwner = membership?.role === 'owner';
  const isAdmin = membership?.role === 'admin';
  const isArtist = membership?.role === 'artist';
  const isOwnerOrAdmin = isOwner || isAdmin;
  const isSuperAdmin = profile?.platform_role === 'super_admin';
  const canAccessOrg = !!membership && membership.status === 'active';

  const value = useMemo(
    () => ({
      organizationSlug,
      organization,
      organizationLoading,
      organizationError,
      membership,
      memberships,
      membershipsLoading,
      isLoading,
      isOwner,
      isAdmin,
      isArtist,
      isOwnerOrAdmin,
      isSuperAdmin,
      canAccessOrg,
    }),
    [
      organizationSlug,
      organization,
      organizationLoading,
      organizationError,
      membership,
      memberships,
      membershipsLoading,
      isLoading,
      isOwner,
      isAdmin,
      isArtist,
      isOwnerOrAdmin,
      isSuperAdmin,
      canAccessOrg,
    ]
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children ?? <Outlet />}
    </OrganizationContext.Provider>
  );
}

export function useOrganizationContext() {
  const ctx = useContext(OrganizationContext);
  if (!ctx) {
    throw new Error(
      'useOrganizationContext must be used inside OrganizationProvider'
    );
  }
  return ctx;
}

export type { OrgRole };
