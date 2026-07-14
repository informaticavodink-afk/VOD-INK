-- Permissive RLS policies during transition. We enable RLS but allow
-- authenticated users to read all rows, and owners/admins to write rows
-- scoped to their organization. This keeps the existing app functional while
-- new code adopts the stricter helpers in the next phase.

create policy "organizations read authenticated"
  on public.organizations for select
  to authenticated
  using (true);

create policy "organizations write owner or admin"
  on public.organizations for all
  to authenticated
  using ((select private.is_org_owner_or_admin(id)))
  with check ((select private.is_org_owner_or_admin(id)));

create policy "organization_memberships read authenticated"
  on public.organization_memberships for select
  to authenticated
  using (true);

create policy "organization_memberships write owner or admin"
  on public.organization_memberships for all
  to authenticated
  using ((select private.is_org_owner_or_admin(organization_id)))
  with check ((select private.is_org_owner_or_admin(organization_id)));

create policy "organization_invitations read authenticated"
  on public.organization_invitations for select
  to authenticated
  using (true);

create policy "organization_invitations write owner or admin"
  on public.organization_invitations for all
  to authenticated
  using ((select private.is_org_owner_or_admin(organization_id)))
  with check ((select private.is_org_owner_or_admin(organization_id)));

create policy "locations read authenticated"
  on public.locations for select
  to authenticated
  using (true);

create policy "locations write owner or admin"
  on public.locations for all
  to authenticated
  using ((select private.is_org_owner_or_admin(organization_id)))
  with check ((select private.is_org_owner_or_admin(organization_id)));

create policy "organization_branding read authenticated"
  on public.organization_branding for select
  to authenticated
  using (true);

create policy "organization_branding write owner or admin"
  on public.organization_branding for all
  to authenticated
  using ((select private.is_org_owner_or_admin(organization_id)))
  with check ((select private.is_org_owner_or_admin(organization_id)));

create policy "organization_settings read authenticated"
  on public.organization_settings for select
  to authenticated
  using (true);

create policy "organization_settings write owner or admin"
  on public.organization_settings for all
  to authenticated
  using ((select private.is_org_owner_or_admin(organization_id)))
  with check ((select private.is_org_owner_or_admin(organization_id)));
