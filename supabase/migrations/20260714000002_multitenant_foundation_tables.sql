-- Organizations, memberships, invitations, locations, branding and settings.

alter table public.profiles
  add column if not exists platform_role public.platform_role not null default 'user';

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  status public.organization_status not null default 'active',
  legal_name text,
  legal_identifier text,
  billing_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.organization_role not null,
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.organization_role not null,
  invited_by uuid not null references public.profiles(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  status public.invitation_status not null default 'pending',
  accepted_by uuid references public.profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invitations_role_check check (role in ('owner', 'admin', 'artist'))
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  address text,
  phone text,
  email text,
  status public.organization_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_branding (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  primary_color text,
  secondary_color text,
  logo_path text,
  font_family text,
  updated_at timestamptz not null default now()
);

create table public.organization_settings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  language text not null default 'es',
  timezone text not null default 'Europe/Madrid',
  consent_redirect_seconds int not null default 5,
  notification_email text,
  updated_at timestamptz not null default now()
);

-- Triggers for updated_at.
create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create trigger organization_memberships_set_updated_at
  before update on public.organization_memberships
  for each row execute function public.set_updated_at();

create trigger organization_invitations_set_updated_at
  before update on public.organization_invitations
  for each row execute function public.set_updated_at();

create trigger locations_set_updated_at
  before update on public.locations
  for each row execute function public.set_updated_at();

create trigger organization_branding_set_updated_at
  before update on public.organization_branding
  for each row execute function public.set_updated_at();

create trigger organization_settings_set_updated_at
  before update on public.organization_settings
  for each row execute function public.set_updated_at();

-- Indexes.
create index organization_memberships_user_id_idx
  on public.organization_memberships (user_id);

create index organization_memberships_org_id_idx
  on public.organization_memberships (organization_id);

create index organization_memberships_org_role_status_idx
  on public.organization_memberships (organization_id, role, status);

create index organization_invitations_org_email_idx
  on public.organization_invitations (organization_id, email);

create index organization_invitations_token_hash_idx
  on public.organization_invitations (token_hash);

create index locations_organization_id_idx
  on public.locations (organization_id);

create index organizations_slug_idx
  on public.organizations (slug);

-- RLS.
alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.locations enable row level security;
alter table public.organization_branding enable row level security;
alter table public.organization_settings enable row level security;

-- Data API grants (RLS still controls row visibility).
grant select, insert, update, delete on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_memberships to authenticated;
grant select, insert, update, delete on public.organization_invitations to authenticated;
grant select, insert, update, delete on public.locations to authenticated;
grant select, insert, update, delete on public.organization_branding to authenticated;
grant select, insert, update, delete on public.organization_settings to authenticated;
