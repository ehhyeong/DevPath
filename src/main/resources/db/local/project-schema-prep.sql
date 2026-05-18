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
CREATE TABLE IF NOT EXISTS public.workspace_hub_project (
    id bigserial PRIMARY KEY,
    dom_id varchar(80) NOT NULL,
    menu_id varchar(80) NOT NULL,
    card_type varchar(20) NOT NULL,
    card_status varchar(20) NOT NULL,
    dashboard_url varchar(120) NOT NULL,
    title varchar(150) NOT NULL,
    description text NOT NULL,
    progress_percent integer NOT NULL,
    mentoring_mode_label varchar(40),
    mentoring_mode_icon varchar(40),
    category_label varchar(40),
    role_label varchar(80),
    footer_kind varchar(20) NOT NULL,
    footer_date_label varchar(40),
    member_avatar_seeds varchar(200),
    extra_member_count integer,
    footer_avatar_seed varchar(80),
    footer_text varchar(120),
    footer_meta_text varchar(80),
    footer_meta_icon varchar(60),
    sort_order integer NOT NULL,
    is_deleted boolean NOT NULL DEFAULT false
);
^^^ END OF SCRIPT ^^^
CREATE UNIQUE INDEX IF NOT EXISTS ux_workspace_hub_project_dom_id
    ON public.workspace_hub_project(dom_id);
^^^ END OF SCRIPT ^^^
CREATE UNIQUE INDEX IF NOT EXISTS ux_workspace_hub_project_menu_id
    ON public.workspace_hub_project(menu_id);
^^^ END OF SCRIPT ^^^
INSERT INTO public.workspace_hub_project (
    dom_id,
    menu_id,
    card_type,
    card_status,
    dashboard_url,
    title,
    description,
    progress_percent,
    mentoring_mode_label,
    mentoring_mode_icon,
    category_label,
    role_label,
    footer_kind,
    footer_date_label,
    member_avatar_seeds,
    extra_member_count,
    footer_avatar_seed,
    footer_text,
    footer_meta_text,
    footer_meta_icon,
    sort_order,
    is_deleted
)
VALUES
    (
        'proj-squad-1',
        'menu-1',
        'squad',
        'progress',
        'workspace-hub.html',
        '배달비 절약 플랫폼',
        '위치 기반 실시간 공동 구매 매칭 서비스 MVP 개발',
        40,
        NULL,
        NULL,
        NULL,
        NULL,
        'avatars',
        '어제',
        'A,B',
        2,
        NULL,
        NULL,
        NULL,
        NULL,
        1,
        false
    ),
    (
        'proj-mentor-1',
        'menu-2',
        'mentoring',
        'progress',
        'workspace-hub.html',
        '대용량 트래픽 커머스',
        'Spring Boot & Redis를 활용한 선착순 쿠폰 시스템 구현 실습',
        20,
        '공통 과제형',
        'fas fa-users mr-1',
        'Backend',
        NULL,
        'mentor',
        NULL,
        NULL,
        NULL,
        'Jonas',
        '멘토 코드마스터 J',
        '리뷰 대기중',
        'fas fa-comment-dots mr-1',
        2,
        false
    ),
    (
        'proj-mentor-2',
        'menu-3',
        'mentoring',
        'progress',
        'workspace-hub.html',
        'React Native 습관 챌린지 앱',
        '기획부터 앱스토어 런칭까지 한 사이클을 경험하는 실전 프로젝트',
        50,
        '팀 프로젝트형',
        'fas fa-puzzle-piece mr-1',
        'App',
        'Backend',
        'mentor',
        NULL,
        NULL,
        NULL,
        'Mobile',
        '멘토 1명, 팀원 4명',
        '2주차 진행중',
        NULL,
        3,
        false
    )
ON CONFLICT (dom_id) DO UPDATE
   SET menu_id = EXCLUDED.menu_id,
       card_type = EXCLUDED.card_type,
       card_status = EXCLUDED.card_status,
       dashboard_url = EXCLUDED.dashboard_url,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       progress_percent = EXCLUDED.progress_percent,
       mentoring_mode_label = EXCLUDED.mentoring_mode_label,
       mentoring_mode_icon = EXCLUDED.mentoring_mode_icon,
       category_label = EXCLUDED.category_label,
       role_label = EXCLUDED.role_label,
       footer_kind = EXCLUDED.footer_kind,
       footer_date_label = EXCLUDED.footer_date_label,
       member_avatar_seeds = EXCLUDED.member_avatar_seeds,
       extra_member_count = EXCLUDED.extra_member_count,
       footer_avatar_seed = EXCLUDED.footer_avatar_seed,
       footer_text = EXCLUDED.footer_text,
       footer_meta_text = EXCLUDED.footer_meta_text,
       footer_meta_icon = EXCLUDED.footer_meta_icon,
       sort_order = EXCLUDED.sort_order,
       is_deleted = EXCLUDED.is_deleted;
^^^ END OF SCRIPT ^^^
DO $$
DECLARE
    v_learner_id bigint;
    v_workspace_id bigint;
    seed record;
BEGIN
    IF to_regclass('public.users') IS NULL
        OR to_regclass('public.workspace') IS NULL
        OR to_regclass('public.workspace_member') IS NULL THEN
        RETURN;
    END IF;

    SELECT user_id
      INTO v_learner_id
      FROM public.users
     WHERE email = 'learner@devpath.com'
     LIMIT 1;

    IF v_learner_id IS NULL THEN
        RETURN;
    END IF;

    ALTER TABLE public.workspace ADD COLUMN IF NOT EXISTS status varchar(20);
    ALTER TABLE public.workspace ADD COLUMN IF NOT EXISTS is_deleted boolean;
    ALTER TABLE public.workspace ADD COLUMN IF NOT EXISTS created_at timestamp(6);
    ALTER TABLE public.workspace ADD COLUMN IF NOT EXISTS updated_at timestamp(6);
    ALTER TABLE public.workspace_member ADD COLUMN IF NOT EXISTS joined_at timestamp(6);

    DELETE FROM public.workspace_member wm
     USING public.workspace w
     WHERE wm.workspace_id = w.id
       AND wm.learner_id = v_learner_id
       AND w.owner_id = v_learner_id
       AND w.name IN ('김하늘 스쿼드 실전 프로젝트', '김하늘 멘토링 실전 프로젝트');

    FOR seed IN
        SELECT *
          FROM (
            VALUES
              (
                '배달비 절약 플랫폼',
                '위치 기반 실시간 공동 구매 매칭 서비스 MVP 개발',
                'SQUAD'
              ),
              (
                '대용량 트래픽 커머스',
                'Spring Boot & Redis를 활용한 선착순 쿠폰 시스템 구현 실습',
                'MENTORING'
              ),
              (
                'React Native 습관 챌린지 앱',
                '기획부터 앱스토어 런칭까지 한 사이클을 경험하는 실전 프로젝트',
                'MENTORING'
              )
          ) AS seed(name, description, type)
    LOOP
        SELECT id
          INTO v_workspace_id
          FROM public.workspace
         WHERE owner_id = v_learner_id
           AND name = seed.name
           AND COALESCE(is_deleted, false) = false
         LIMIT 1;

        IF v_workspace_id IS NULL THEN
            INSERT INTO public.workspace (
                owner_id,
                name,
                description,
                type,
                status,
                is_deleted,
                created_at,
                updated_at
            )
            VALUES (
                v_learner_id,
                seed.name,
                seed.description,
                seed.type,
                'ACTIVE',
                false,
                now(),
                now()
            )
            RETURNING id INTO v_workspace_id;
        ELSE
            UPDATE public.workspace
               SET description = seed.description,
                   type = seed.type,
                   status = COALESCE(status, 'ACTIVE'),
                   is_deleted = false,
                   updated_at = now()
             WHERE id = v_workspace_id;
        END IF;

        IF NOT EXISTS (
            SELECT 1
              FROM public.workspace_member
             WHERE workspace_id = v_workspace_id
               AND learner_id = v_learner_id
        ) THEN
            INSERT INTO public.workspace_member (workspace_id, learner_id, joined_at)
            VALUES (v_workspace_id, v_learner_id, now());
        END IF;
    END LOOP;
END $$;
^^^ END OF SCRIPT ^^^
DO $$
DECLARE
    v_mentor_id bigint;
    v_post_id bigint;
    seed record;
    seed_password text := '$2a$10$7EqJtq98hPqEX7fNZaFWoOhiYGu4z9pYwaAIpUO3Q1zDi0SsQiiA.';
BEGIN
    IF to_regclass('public.users') IS NULL OR to_regclass('public.mentoring_posts') IS NULL THEN
        RETURN;
    END IF;

    FOR seed IN
        SELECT *
          FROM (
            VALUES
              (
                'mentor.backend@devpath.com',
                '김도윤',
                '대용량 트래픽과 결제 도메인을 다뤄 온 백엔드 리드입니다.',
                'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-backend',
                '대용량 이커머스 주문 서버 멘토링',
                '실제 운영 환경과 유사한 주문, 재고, 쿠폰 시나리오를 구현하며 백엔드 구조를 점검합니다.',
                'Spring Boot, Redis, Kafka, PostgreSQL',
                'Backend',
                'study',
                4,
                5,
                10,
                E'요구사항 분석과 ERD 설계\n주문, 결제, 재고 핵심 API 구현\nRedis와 Kafka를 활용한 트래픽 분산\n부하 테스트와 병목 지점 리팩터링',
                14,
                false
              ),
              (
                'mentor.frontend@devpath.com',
                '이서연',
                '프로덕트 UI와 Next.js 성능 최적화를 함께 보는 프론트엔드 멘토입니다.',
                'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-frontend',
                'Next.js 블로그 플랫폼 팀 프로젝트',
                '기획부터 배포까지 하나의 블로그 플랫폼을 완성하며 App Router와 SEO를 실습합니다.',
                'React, Next.js, TypeScript, Tailwind',
                'Frontend',
                'team',
                4,
                3,
                4,
                E'App Router 구조와 라우팅 설계\n마크다운 에디터와 게시글 상세 구현\n디자인 시스템과 다크 모드 적용\nVercel 배포와 성능 측정',
                3,
                false
              ),
              (
                'mentor.mobile@devpath.com',
                '한유라',
                'React Native와 출시 품질 관리 경험이 많은 모바일 멘토입니다.',
                'https://api.dicebear.com/7.x/avataaars/svg?seed=mentor-mobile',
                'React Native 출시형 사이드 프로젝트',
                '앱스토어 등록을 목표로 화면, 인증, 푸시, QA 체크리스트까지 같이 완성합니다.',
                'React Native, Expo, Firebase',
                'App',
                'team',
                5,
                4,
                5,
                E'아이디어 스코프와 와이어프레임 정리\nExpo 기반 핵심 화면 구현\nFirebase Auth와 Push 연동\nQA와 스토어 제출 준비',
                9,
                false
              )
          ) AS seed(
              email,
              name,
              bio,
              profile_image,
              title,
              content,
              required_stacks,
              category,
              mentoring_type,
              duration_weeks,
              current_participants,
              max_participants,
              curriculum,
              deadline_days,
              closed
          )
    LOOP
        INSERT INTO public.users (
            email,
            password,
            name,
            role_name,
            created_at,
            updated_at,
            is_active,
            account_status
        )
        VALUES (
            seed.email,
            seed_password,
            seed.name,
            'ROLE_INSTRUCTOR',
            now(),
            now(),
            true,
            'ACTIVE'
        )
        ON CONFLICT (email) DO UPDATE
           SET name = EXCLUDED.name,
               role_name = EXCLUDED.role_name,
               is_active = true,
               account_status = 'ACTIVE',
               updated_at = now();

        SELECT user_id
          INTO v_mentor_id
          FROM public.users
         WHERE email = seed.email
         LIMIT 1;

        IF to_regclass('public.user_profiles') IS NOT NULL THEN
            UPDATE public.user_profiles
               SET profile_image = seed.profile_image,
                   channel_name = seed.name,
                   bio = seed.bio,
                   channel_description = seed.bio,
                   is_public = true,
                   updated_at = now()
             WHERE user_id = v_mentor_id;

            IF NOT FOUND THEN
                INSERT INTO public.user_profiles (
                    user_id,
                    profile_image,
                    channel_name,
                    bio,
                    channel_description,
                    is_public,
                    created_at,
                    updated_at
                )
                VALUES (
                    v_mentor_id,
                    seed.profile_image,
                    seed.name,
                    seed.bio,
                    seed.bio,
                    true,
                    now(),
                    now()
                );
            END IF;
        END IF;

        SELECT mentoring_post_id
          INTO v_post_id
          FROM public.mentoring_posts
         WHERE title = seed.title
           AND COALESCE(is_deleted, false) = false
         LIMIT 1;

        IF v_post_id IS NULL THEN
            INSERT INTO public.mentoring_posts (
                mentor_id,
                title,
                content,
                required_stacks,
                category,
                mentoring_type,
                duration_weeks,
                curriculum,
                deadline_at,
                current_participants,
                max_participants,
                view_count,
                status,
                is_deleted,
                created_at,
                updated_at
            )
            VALUES (
                v_mentor_id,
                seed.title,
                seed.content,
                seed.required_stacks,
                seed.category,
                seed.mentoring_type,
                seed.duration_weeks,
                seed.curriculum,
                CURRENT_DATE + seed.deadline_days,
                seed.current_participants,
                seed.max_participants,
                0,
                CASE WHEN seed.closed THEN 'CLOSED' ELSE 'OPEN' END,
                false,
                now(),
                now()
            );
        ELSE
            UPDATE public.mentoring_posts
               SET mentor_id = v_mentor_id,
                   content = seed.content,
                   required_stacks = seed.required_stacks,
                   category = seed.category,
                   mentoring_type = seed.mentoring_type,
                   duration_weeks = seed.duration_weeks,
                   curriculum = seed.curriculum,
                   deadline_at = CURRENT_DATE + seed.deadline_days,
                   current_participants = seed.current_participants,
                   max_participants = seed.max_participants,
                   status = CASE WHEN seed.closed THEN 'CLOSED' ELSE 'OPEN' END,
                   is_deleted = false,
                   updated_at = now()
             WHERE mentoring_post_id = v_post_id;
        END IF;
    END LOOP;
END $$;
^^^ END OF SCRIPT ^^^
CREATE TABLE IF NOT EXISTS public.workspace_hub_project (
    id bigserial PRIMARY KEY,
    dom_id varchar(80) NOT NULL,
    menu_id varchar(80) NOT NULL,
    card_type varchar(20) NOT NULL,
    card_status varchar(20) NOT NULL,
    dashboard_url varchar(120) NOT NULL,
    title varchar(150) NOT NULL,
    description text NOT NULL,
    progress_percent integer NOT NULL,
    mentoring_mode_label varchar(40),
    mentoring_mode_icon varchar(40),
    category_label varchar(40),
    role_label varchar(80),
    footer_kind varchar(20) NOT NULL,
    footer_date_label varchar(40),
    member_avatar_seeds varchar(200),
    extra_member_count integer,
    footer_avatar_seed varchar(80),
    footer_text varchar(120),
    footer_meta_text varchar(80),
    footer_meta_icon varchar(60),
    sort_order integer NOT NULL,
    is_deleted boolean NOT NULL DEFAULT false
);
^^^ END OF SCRIPT ^^^
CREATE UNIQUE INDEX IF NOT EXISTS ux_workspace_hub_project_dom_id
    ON public.workspace_hub_project(dom_id);
^^^ END OF SCRIPT ^^^
CREATE UNIQUE INDEX IF NOT EXISTS ux_workspace_hub_project_menu_id
    ON public.workspace_hub_project(menu_id);
^^^ END OF SCRIPT ^^^
DO $$
BEGIN
    IF to_regclass('public.squad_members') IS NULL THEN
        RETURN;
    END IF;

    ALTER TABLE public.squad_members ADD COLUMN IF NOT EXISTS is_deleted boolean;

    UPDATE public.squad_members
       SET is_deleted = false
     WHERE is_deleted IS NULL;

    ALTER TABLE public.squad_members ALTER COLUMN is_deleted SET DEFAULT false;
    ALTER TABLE public.squad_members ALTER COLUMN is_deleted SET NOT NULL;
    ALTER TABLE public.squad_members ADD COLUMN IF NOT EXISTS deleted_at timestamp(6);
END $$;
^^^ END OF SCRIPT ^^^
DO $$
DECLARE
    v_backend_company_id bigint;
    v_devops_company_id bigint;
    v_ai_company_id bigint;
BEGIN
    IF to_regclass('public.companies') IS NULL
        OR to_regclass('public.job_postings') IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO public.companies (
        name,
        description,
        website_url,
        logo_url,
        industry,
        location,
        verification_status,
        is_deleted,
        created_at,
        updated_at
    )
    SELECT
        seed.name,
        seed.description,
        seed.website_url,
        seed.logo_url,
        seed.industry,
        seed.location,
        'VERIFIED',
        false,
        now(),
        now()
    FROM (
        VALUES
            ('DevPath Labs', 'Developer education and career platform', 'https://devpath.local/jobs', NULL, 'EdTech', '서울 강남구'),
            ('Cloud Native Studio', 'Cloud infrastructure consulting team', 'https://cloud-native.local/jobs', NULL, 'Cloud', '성남 판교'),
            ('Data Sprint AI', 'AI product analytics startup', 'https://datasprint.local/jobs', NULL, 'AI', '서울 마포구')
    ) AS seed(name, description, website_url, logo_url, industry, location)
    WHERE NOT EXISTS (
        SELECT 1
          FROM public.companies c
         WHERE c.name = seed.name
           AND COALESCE(c.is_deleted, false) = false
    );

    SELECT company_id INTO v_backend_company_id
      FROM public.companies
     WHERE name = 'DevPath Labs'
     LIMIT 1;

    SELECT company_id INTO v_devops_company_id
      FROM public.companies
     WHERE name = 'Cloud Native Studio'
     LIMIT 1;

    SELECT company_id INTO v_ai_company_id
      FROM public.companies
     WHERE name = 'Data Sprint AI'
     LIMIT 1;

    INSERT INTO public.job_postings (
        company_id,
        title,
        job_role,
        description,
        required_skills,
        region,
        career_level,
        source_url,
        source,
        status,
        deadline,
        external_job_id,
        is_deleted,
        created_at,
        updated_at
    )
    SELECT
        seed.company_id,
        seed.title,
        seed.job_role,
        seed.description,
        seed.required_skills,
        seed.region,
        seed.career_level,
        seed.source_url,
        'INTERNAL',
        'OPEN',
        CURRENT_DATE + seed.deadline_days,
        seed.external_job_id,
        false,
        now(),
        now()
    FROM (
        VALUES
            (
                v_backend_company_id,
                '백엔드 개발자 Java/Spring 주니어 채용',
                'Backend Developer',
                'Spring Boot 기반 API와 PostgreSQL 데이터 모델을 함께 개발할 주니어 백엔드 개발자를 찾습니다.',
                'Java, Spring Boot, JPA, PostgreSQL, AWS',
                '서울 강남구',
                'JUNIOR',
                'https://devpath.local/jobs/backend-junior',
                'local-job-backend-001',
                42
            ),
            (
                v_devops_company_id,
                '클라우드 인프라 엔지니어 신입 채용',
                'DevOps Engineer',
                'Linux, Docker, Kubernetes 기반 운영 자동화와 CI/CD 파이프라인을 함께 구축합니다.',
                'Linux, Docker, Kubernetes, AWS, GitHub Actions',
                '성남 판교',
                'JUNIOR',
                'https://cloud-native.local/jobs/devops-junior',
                'local-job-devops-001',
                35
            ),
            (
                v_ai_company_id,
                'AI 서비스 백엔드/데이터 엔지니어 채용',
                'Data Engineer',
                '추천 시스템과 로그 파이프라인을 운영하며 Python, SQL, Spring Boot 서비스를 함께 다룹니다.',
                'Python, SQL, Spring Boot, Kafka, MLOps',
                '서울 마포구',
                'JUNIOR',
                'https://datasprint.local/jobs/data-ai-junior',
                'local-job-ai-001',
                50
            )
    ) AS seed(company_id, title, job_role, description, required_skills, region, career_level, source_url, external_job_id, deadline_days)
    WHERE seed.company_id IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
            FROM public.job_postings jp
           WHERE jp.external_job_id = seed.external_job_id
             AND COALESCE(jp.is_deleted, false) = false
      );
END $$;
^^^ END OF SCRIPT ^^^
DO $$
BEGIN
    IF to_regclass('public.lessons') IS NULL
        OR to_regclass('public.course_sections') IS NULL THEN
        RETURN;
    END IF;

    UPDATE public.lessons
       SET video_url = '/samples/devpath_ocr.mp4'
     WHERE section_id IN (
         SELECT section_id FROM public.course_sections WHERE sort_order = 1
     );

    UPDATE public.lessons
       SET video_url = '/samples/devpath_ocr_ver2.mp4'
     WHERE section_id IN (
         SELECT section_id FROM public.course_sections WHERE sort_order = 2
     );
END $$;
^^^ END OF SCRIPT ^^^
