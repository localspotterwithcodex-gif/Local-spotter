-- 3.1 Row Level Security on every table in "public", with no policies. This blocks Supabase's public data API
-- (anon/authenticated roles) entirely; the backend connects as the table owner, which RLS does not restrict.
-- Idempotent. Tables added by later migrations must enable RLS too: scripts/check-rls.mjs fails CI otherwise.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.relname);
  END LOOP;
END $$;
