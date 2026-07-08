-- Add client_email column to consents table
ALTER TABLE public.consents ADD COLUMN client_email text;
