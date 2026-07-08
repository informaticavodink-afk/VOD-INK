-- Add 'pending_technique' value to the consent_status enum
ALTER TYPE public.consent_status ADD VALUE 'pending_technique' BEFORE 'pending_artist';
