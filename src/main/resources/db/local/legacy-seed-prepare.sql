DO $$
DECLARE
    target record;
BEGIN
    FOR target IN
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'is_deleted'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.%I ALTER COLUMN is_deleted SET DEFAULT false',
            target.table_name
        );
    END LOOP;
END $$;

ALTER TABLE IF EXISTS workspace_file
    ALTER COLUMN item_type SET DEFAULT 'FILE';

ALTER TABLE IF EXISTS workspace_file
    ALTER COLUMN storage_provider SET DEFAULT 'LOCAL';
