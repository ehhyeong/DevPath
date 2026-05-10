DO $$
DECLARE
    fallback_owner_id bigint := 1;
BEGIN
    IF to_regclass('public.project') IS NULL THEN
        RETURN;
    END IF;

    ALTER TABLE public.project ADD COLUMN IF NOT EXISTS owner_id bigint;
    ALTER TABLE public.project ADD COLUMN IF NOT EXISTS project_type varchar(20);
    ALTER TABLE public.project ADD COLUMN IF NOT EXISTS visibility varchar(20);
    ALTER TABLE public.project ADD COLUMN IF NOT EXISTS recruiting_status varchar(20);

    IF to_regclass('public.users') IS NOT NULL THEN
        SELECT user_id
          INTO fallback_owner_id
          FROM public.users
         WHERE email = 'learner@devpath.com'
         LIMIT 1;

        IF fallback_owner_id IS NULL THEN
            SELECT user_id
              INTO fallback_owner_id
              FROM public.users
             ORDER BY user_id
             LIMIT 1;
        END IF;
    END IF;

    IF fallback_owner_id IS NULL THEN
        fallback_owner_id := 1;
    END IF;

    UPDATE public.project
       SET owner_id = fallback_owner_id
     WHERE owner_id IS NULL;

    UPDATE public.project
       SET project_type = 'SQUAD'
     WHERE project_type IS NULL;

    UPDATE public.project
       SET visibility = 'PRIVATE'
     WHERE visibility IS NULL;

    UPDATE public.project
       SET recruiting_status = 'CLOSED'
     WHERE recruiting_status IS NULL;

    ALTER TABLE public.project ALTER COLUMN owner_id SET NOT NULL;
    ALTER TABLE public.project ALTER COLUMN project_type SET NOT NULL;
    ALTER TABLE public.project ALTER COLUMN visibility SET NOT NULL;
    ALTER TABLE public.project ALTER COLUMN recruiting_status SET NOT NULL;
END $$;
^^^ END OF SCRIPT ^^^
