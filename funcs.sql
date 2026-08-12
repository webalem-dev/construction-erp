-- Enums + functions + views + triggers
SELECT t.typname, e.enumlabel
FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname='public'
ORDER BY t.typname, e.enumsortorder;

SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args, p.prosecdef
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname='public'
ORDER BY p.proname;

SELECT viewname FROM pg_views WHERE schemaname='public' ORDER BY viewname;

SELECT event_object_table, trigger_name, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema='public'
ORDER BY event_object_table, trigger_name;
