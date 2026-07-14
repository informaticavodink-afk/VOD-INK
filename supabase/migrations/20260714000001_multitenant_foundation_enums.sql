-- Enums for the multi-tenant foundation layer.
-- These are additive; existing enums are left untouched.

create type public.platform_role as enum ('user', 'super_admin');
create type public.organization_role as enum ('owner', 'admin', 'artist');
create type public.membership_status as enum ('active', 'inactive');
create type public.organization_status as enum ('active', 'paused', 'suspended');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked');
