-- 0005_harden_set_updated_at.sql — pin search_path on the commerce trigger fn
-- (advisor 0011 function_search_path_mutable). now() resolves via pg_catalog.
alter function public.set_updated_at() set search_path = '';
