/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Database } from '@/src/types/supabase';

type Organization = Database['public']['Tables']['organizations']['Row'];

export function useOrganization(slug: string | undefined) {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setOrganization(null);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    setLoading(true);
    setError(null);

    supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
          setOrganization(null);
        } else {
          setOrganization(data);
        }
        setLoading(false);
      });
  }, [slug]);

  return { organization, loading, error };
}
