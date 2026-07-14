/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/src/types/supabase';

type Membership = Database['public']['Tables']['organization_memberships']['Row'];

export function useMemberships(userId: string | undefined) {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setMemberships([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    setLoading(true);
    setError(null);

    supabase
      .from('organization_memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('joined_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setMemberships(data || []);
        }
        setLoading(false);
      });
  }, [userId]);

  return { memberships, loading, error };
}
