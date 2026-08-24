import type { Client } from 'pg';

export type ArtistFkContract = {
  name: string;
  columns: string[];
  referencedColumns: string[];
};

export async function readArtistFkContract(db: Pick<Client, 'query'>): Promise<ArtistFkContract[]> {
  const result = await db.query<ArtistFkContract>(`
    select
      constraint_row.conname as name,
      array_agg(local_column.attname::text order by key_column.ordinality) as columns,
      array_agg(referenced_column.attname::text order by key_column.ordinality) as "referencedColumns"
    from pg_constraint as constraint_row
    cross join lateral unnest(constraint_row.conkey, constraint_row.confkey)
      with ordinality as key_column(local_number, referenced_number, ordinality)
    join pg_attribute as local_column
      on local_column.attrelid = constraint_row.conrelid
      and local_column.attnum = key_column.local_number
    join pg_attribute as referenced_column
      on referenced_column.attrelid = constraint_row.confrelid
      and referenced_column.attnum = key_column.referenced_number
    where constraint_row.contype = 'f'
      and constraint_row.conrelid = 'public.consents'::regclass
      and constraint_row.confrelid = 'public.artists'::regclass
    group by constraint_row.conname
    order by constraint_row.conname
  `);

  return result.rows;
}
