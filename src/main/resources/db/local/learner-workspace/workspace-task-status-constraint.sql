DO $$
BEGIN
    IF to_regclass('public.workspace_task') IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.workspace_task'::regclass
          AND conname = 'workspace_task_status_check'
    ) THEN
        ALTER TABLE public.workspace_task DROP CONSTRAINT workspace_task_status_check;
    END IF;

    ALTER TABLE public.workspace_task
        ADD CONSTRAINT workspace_task_status_check
        CHECK (status IN ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'));
END $$;
