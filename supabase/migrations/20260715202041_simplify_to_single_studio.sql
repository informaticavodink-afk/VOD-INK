-- VOD INK is a single-studio application.
-- Add the studio administrator role before using it in later migrations.
-- PostgreSQL requires this enum value to be committed in its own migration.
alter type public.profile_role add value if not exists 'admin';
