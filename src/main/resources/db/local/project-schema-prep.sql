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
DO $$
BEGIN
    IF to_regclass('public.roadmap_hub_items') IS NULL THEN
        RETURN;
    END IF;

    ALTER TABLE public.roadmap_hub_items
        ADD COLUMN IF NOT EXISTS item_category varchar(80);
END $$;
^^^ END OF SCRIPT ^^^
DO $$
BEGIN
    IF to_regclass('public.roadmap_hub_items') IS NULL
        OR to_regclass('public.roadmap_hub_sections') IS NULL THEN
        RETURN;
    END IF;

    UPDATE public.roadmap_hub_items item
       SET item_category = seed.item_category
      FROM public.roadmap_hub_sections section_item
      JOIN (
          VALUES
              ('role-based', 'Frontend', '웹 개발'),
              ('role-based', 'Backend', '웹 개발'),
              ('role-based', 'Full Stack', '웹 개발'),
              ('role-based', 'DevOps', '인프라/DevOps'),
              ('role-based', 'DevSecOps', '보안'),
              ('role-based', 'Data Analyst', '데이터/AI'),
              ('role-based', 'AI Engineer', '데이터/AI'),
              ('role-based', 'AI and Data Scientist', '데이터/AI'),
              ('role-based', 'Data Engineer', '데이터/AI'),
              ('role-based', 'Android', '모바일'),
              ('role-based', 'Machine Learning', '데이터/AI'),
              ('role-based', 'PostgreSQL', '데이터베이스'),
              ('role-based', 'iOS', '모바일'),
              ('role-based', 'Blockchain', '블록체인'),
              ('role-based', 'QA', '품질/테스트'),
              ('role-based', 'Software Architect', '아키텍처'),
              ('role-based', 'Cyber Security', '보안'),
              ('role-based', 'UX Design', '디자인'),
              ('role-based', 'Technical Writer', '문서/협업'),
              ('role-based', 'Game Developer', '게임'),
              ('role-based', 'Server Side Game Developer', '게임'),
              ('role-based', 'MLOps', '인프라/DevOps'),
              ('role-based', 'Product Manager', '기획/관리'),
              ('role-based', 'Engineering Manager', '기획/관리'),
              ('role-based', 'Developer Relations', '문서/협업'),
              ('role-based', 'BI Analyst', '데이터/AI'),
              ('skill-based', 'SQL', '데이터베이스'),
              ('skill-based', 'Computer Science', 'CS'),
              ('skill-based', 'React', '프론트엔드'),
              ('skill-based', 'Vue', '프론트엔드'),
              ('skill-based', 'Angular', '프론트엔드'),
              ('skill-based', 'JavaScript', '프론트엔드'),
              ('skill-based', 'TypeScript', '프론트엔드'),
              ('skill-based', 'Node.js', '백엔드'),
              ('skill-based', 'Python', '언어'),
              ('skill-based', 'System Design', 'CS'),
              ('skill-based', 'Java', '백엔드'),
              ('skill-based', 'ASP.NET Core', '백엔드'),
              ('skill-based', 'API Design', '백엔드'),
              ('skill-based', 'Spring Boot', '백엔드'),
              ('skill-based', 'Flutter', '모바일'),
              ('skill-based', 'C++', '언어'),
              ('skill-based', 'Rust', '언어'),
              ('skill-based', 'Go Roadmap', '언어'),
              ('skill-based', 'Design and Architecture', '디자인'),
              ('skill-based', 'GraphQL', '백엔드'),
              ('skill-based', 'React Native', '모바일'),
              ('skill-based', 'Design System', '디자인'),
              ('skill-based', 'Prompt Engineering', 'AI'),
              ('skill-based', 'MongoDB', '데이터베이스'),
              ('skill-based', 'Linux', 'DevOps/Cloud'),
              ('skill-based', 'Kubernetes', 'DevOps/Cloud'),
              ('skill-based', 'Docker', 'DevOps/Cloud'),
              ('skill-based', 'AWS', 'DevOps/Cloud'),
              ('skill-based', 'Terraform', 'DevOps/Cloud'),
              ('skill-based', 'Data Structures & Algorithms', 'CS'),
              ('skill-based', 'Redis', '데이터베이스'),
              ('skill-based', 'Git and GitHub', '도구'),
              ('skill-based', 'PHP', '백엔드'),
              ('skill-based', 'Cloudflare', 'DevOps/Cloud'),
              ('skill-based', 'AI Red Teaming', 'AI'),
              ('skill-based', 'AI Agents', 'AI'),
              ('skill-based', 'Next.js', '프론트엔드'),
              ('skill-based', 'Code Review', '도구'),
              ('skill-based', 'Kotlin', '언어'),
              ('skill-based', 'HTML', '프론트엔드'),
              ('skill-based', 'CSS', '프론트엔드'),
              ('skill-based', 'Swift & Swift UI', '언어'),
              ('skill-based', 'Shell / Bash', '도구'),
              ('skill-based', 'Laravel', '백엔드'),
              ('skill-based', 'Elasticsearch', '데이터베이스'),
              ('skill-based', 'WordPress', '백엔드'),
              ('skill-based', 'Django', '백엔드'),
              ('skill-based', 'Ruby', '언어'),
              ('skill-based', 'Ruby on Rails', '백엔드'),
              ('skill-based', 'Claude Code', 'AI'),
              ('skill-based', 'Vibe Coding', 'AI'),
              ('skill-based', 'Scala', '언어'),
              ('skill-based', 'OpenClaw', 'AI')
      ) AS seed(section_key, lookup_value, item_category)
        ON section_item.section_key = seed.section_key
     WHERE item.section_id = section_item.id
       AND (item.title = seed.lookup_value OR item.subtitle = seed.lookup_value)
       AND (item.item_category IS NULL OR item.item_category = '');
END $$;
^^^ END OF SCRIPT ^^^
DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS public.team_workspace_header_notification (
        team_workspace_header_notification_id bigserial PRIMARY KEY,
        workspace_id bigint NOT NULL,
        page_key varchar(40) NOT NULL,
        message varchar(500) NOT NULL,
        time_label varchar(40) NOT NULL,
        target_path varchar(120),
        display_order integer NOT NULL DEFAULT 0,
        is_deleted boolean NOT NULL DEFAULT false,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_team_workspace_header_notification_workspace_page
        ON public.team_workspace_header_notification (workspace_id, page_key, display_order);
END $$;
^^^ END OF SCRIPT ^^^
DO $$
BEGIN
    IF to_regclass('public.voice_channels') IS NULL OR to_regclass('public.users') IS NULL THEN
        RETURN;
    END IF;

    ALTER TABLE public.voice_channels
        ADD COLUMN IF NOT EXISTS current_session_started_at timestamp;

    CREATE TABLE IF NOT EXISTS public.voice_lobby_presence (
        voice_lobby_presence_id bigserial PRIMARY KEY,
        voice_channel_id bigint NOT NULL REFERENCES public.voice_channels(voice_channel_id),
        user_id bigint NOT NULL REFERENCES public.users(user_id),
        last_seen_at timestamp NOT NULL DEFAULT now(),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT uk_voice_lobby_presence_channel_user UNIQUE (voice_channel_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_voice_lobby_presence_channel_seen
        ON public.voice_lobby_presence (voice_channel_id, last_seen_at);

    CREATE TABLE IF NOT EXISTS public.voice_chat_messages (
        voice_chat_message_id bigserial PRIMARY KEY,
        voice_channel_id bigint NOT NULL REFERENCES public.voice_channels(voice_channel_id),
        sender_id bigint NOT NULL REFERENCES public.users(user_id),
        content text NOT NULL,
        is_deleted boolean NOT NULL DEFAULT false,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_voice_chat_messages_channel_created
        ON public.voice_chat_messages (voice_channel_id, created_at);

    CREATE TABLE IF NOT EXISTS public.voice_chat_clear_states (
        voice_chat_clear_state_id bigserial PRIMARY KEY,
        voice_channel_id bigint NOT NULL REFERENCES public.voice_channels(voice_channel_id),
        user_id bigint NOT NULL REFERENCES public.users(user_id),
        cleared_at timestamp NOT NULL DEFAULT now(),
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        CONSTRAINT uk_voice_chat_clear_state_channel_user UNIQUE (voice_channel_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_voice_chat_clear_state_channel_user
        ON public.voice_chat_clear_states (voice_channel_id, user_id);

    CREATE TABLE IF NOT EXISTS public.voice_meeting_minutes (
        voice_meeting_minutes_id bigserial PRIMARY KEY,
        voice_channel_id bigint NOT NULL UNIQUE REFERENCES public.voice_channels(voice_channel_id),
        updated_by_user_id bigint NOT NULL REFERENCES public.users(user_id),
        recording boolean NOT NULL DEFAULT false,
        transcript text,
        summary text,
        is_deleted boolean NOT NULL DEFAULT false,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
    );
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
    ALTER TABLE public.workspace_member ADD COLUMN IF NOT EXISTS last_active_at timestamp(6);

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
CREATE TABLE IF NOT EXISTS public.workspace_code_reviews (
    id bigserial PRIMARY KEY,
    workspace_id bigint NOT NULL,
    title varchar(180) NOT NULL,
    description text,
    pr_url varchar(1000),
    file_path varchar(300) NOT NULL DEFAULT 'src/main/java/com/devpath/auth/AuthService.java',
    diff_text text NOT NULL,
    source_branch varchar(120) NOT NULL DEFAULT 'feature/manual-review',
    target_branch varchar(120) NOT NULL DEFAULT 'main',
    author_id bigint NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'OPEN',
    additions integer NOT NULL DEFAULT 0,
    deletions integer NOT NULL DEFAULT 0,
    ai_code_review_id bigint,
    external_provider varchar(50),
    external_id varchar(220),
    external_author_name varchar(120),
    external_author_avatar_url varchar(1000),
    external_updated_at timestamp,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);
^^^ END OF SCRIPT ^^^
DO $$
BEGIN
    IF to_regclass('public.workspace_code_reviews') IS NULL THEN
        RETURN;
    END IF;

    ALTER TABLE public.workspace_code_reviews
        ADD COLUMN IF NOT EXISTS external_provider varchar(50);
    ALTER TABLE public.workspace_code_reviews
        ADD COLUMN IF NOT EXISTS external_id varchar(220);
    ALTER TABLE public.workspace_code_reviews
        ADD COLUMN IF NOT EXISTS external_author_name varchar(120);
    ALTER TABLE public.workspace_code_reviews
        ADD COLUMN IF NOT EXISTS external_author_avatar_url varchar(1000);
    ALTER TABLE public.workspace_code_reviews
        ADD COLUMN IF NOT EXISTS external_updated_at timestamp;
END $$;
^^^ END OF SCRIPT ^^^
CREATE INDEX IF NOT EXISTS ix_workspace_code_reviews_workspace
    ON public.workspace_code_reviews(workspace_id, status, created_at DESC);
^^^ END OF SCRIPT ^^^
CREATE INDEX IF NOT EXISTS ix_workspace_code_reviews_ai
    ON public.workspace_code_reviews(ai_code_review_id);
^^^ END OF SCRIPT ^^^
CREATE INDEX IF NOT EXISTS ix_workspace_code_reviews_external
    ON public.workspace_code_reviews(workspace_id, external_provider, external_id);
^^^ END OF SCRIPT ^^^
CREATE TABLE IF NOT EXISTS public.workspace_code_review_comments (
    id bigserial PRIMARY KEY,
    review_id bigint NOT NULL,
    workspace_id bigint NOT NULL,
    author_id bigint NOT NULL,
    body text NOT NULL,
    status_label varchar(50) NOT NULL DEFAULT 'Commented',
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);
^^^ END OF SCRIPT ^^^
CREATE INDEX IF NOT EXISTS ix_workspace_code_review_comments_review
    ON public.workspace_code_review_comments(workspace_id, review_id, created_at ASC);
^^^ END OF SCRIPT ^^^
CREATE TABLE IF NOT EXISTS public.workspace_erd_documents (
    workspace_id bigint PRIMARY KEY,
    mermaid_code text NOT NULL,
    schema_json text NOT NULL,
    version integer NOT NULL DEFAULT 1,
    updated_by_id bigint,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);
^^^ END OF SCRIPT ^^^
CREATE TABLE IF NOT EXISTS public.workspace_erd_versions (
    version_id bigserial PRIMARY KEY,
    workspace_id bigint NOT NULL,
    version integer NOT NULL,
    mermaid_code text NOT NULL,
    schema_json text NOT NULL,
    summary varchar(500),
    updated_by_id bigint,
    discussion_message_id bigint,
    created_at timestamp NOT NULL DEFAULT now(),
    CONSTRAINT workspace_erd_versions_unique UNIQUE (workspace_id, version)
);
^^^ END OF SCRIPT ^^^
CREATE INDEX IF NOT EXISTS idx_workspace_erd_versions_workspace
    ON public.workspace_erd_versions(workspace_id, version DESC);
^^^ END OF SCRIPT ^^^
CREATE TABLE IF NOT EXISTS public.workspace_erd_comments (
    comment_id bigserial PRIMARY KEY,
    workspace_id bigint NOT NULL,
    target_type varchar(30) NOT NULL,
    target_id varchar(200) NOT NULL,
    target_label varchar(200),
    author_id bigint NOT NULL,
    body text NOT NULL,
    is_deleted boolean NOT NULL DEFAULT false,
    created_at timestamp NOT NULL DEFAULT now(),
    updated_at timestamp NOT NULL DEFAULT now()
);
^^^ END OF SCRIPT ^^^
CREATE INDEX IF NOT EXISTS idx_workspace_erd_comments_target
    ON public.workspace_erd_comments(workspace_id, target_type, target_id, created_at ASC);
^^^ END OF SCRIPT ^^^
DO $$
BEGIN
    IF to_regclass('public.workspace_file') IS NULL THEN
        RETURN;
    END IF;

    ALTER TABLE public.workspace_file ADD COLUMN IF NOT EXISTS parent_id bigint;
    ALTER TABLE public.workspace_file ADD COLUMN IF NOT EXISTS item_type varchar(20);
    ALTER TABLE public.workspace_file ADD COLUMN IF NOT EXISTS storage_provider varchar(50);
    ALTER TABLE public.workspace_file ADD COLUMN IF NOT EXISTS object_key varchar(1000);
    ALTER TABLE public.workspace_file ADD COLUMN IF NOT EXISTS updated_at timestamp;

    UPDATE public.workspace_file
       SET item_type = 'FILE'
     WHERE item_type IS NULL;

    UPDATE public.workspace_file
       SET storage_provider = 'LOCAL'
     WHERE storage_provider IS NULL;

    UPDATE public.workspace_file
       SET updated_at = COALESCE(created_at, now())
     WHERE updated_at IS NULL;

    ALTER TABLE public.workspace_file ALTER COLUMN item_type SET DEFAULT 'FILE';
    ALTER TABLE public.workspace_file ALTER COLUMN item_type SET NOT NULL;
    ALTER TABLE public.workspace_file ALTER COLUMN storage_provider SET DEFAULT 'LOCAL';
    ALTER TABLE public.workspace_file ALTER COLUMN storage_provider SET NOT NULL;

    CREATE INDEX IF NOT EXISTS idx_workspace_file_workspace_parent
        ON public.workspace_file(workspace_id, parent_id, is_deleted, item_type, created_at DESC);
END $$;
^^^ END OF SCRIPT ^^^
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

    -- job_skill_tags: local-job-backend-001 (Java, Spring Boot, JPA, PostgreSQL, AWS)
    INSERT INTO public.job_skill_tags (job_posting_id, name, source, confidence_score, matched_keyword, is_deleted, created_at, updated_at)
    SELECT jp.job_posting_id, skill.name, 'JD_RULE_BASED', skill.score, skill.name, false, now(), now()
    FROM public.job_postings jp
    CROSS JOIN (VALUES ('Java', 0.95), ('Spring Boot', 0.98), ('JPA', 0.91), ('PostgreSQL', 0.90), ('AWS', 0.85)) AS skill(name, score)
    WHERE jp.external_job_id = 'local-job-backend-001'
      AND NOT EXISTS (SELECT 1 FROM public.job_skill_tags t WHERE t.job_posting_id = jp.job_posting_id AND t.name = skill.name);

    -- job_skill_tags: local-job-devops-001 (Docker, Kubernetes, AWS, CI/CD, Linux)
    INSERT INTO public.job_skill_tags (job_posting_id, name, source, confidence_score, matched_keyword, is_deleted, created_at, updated_at)
    SELECT jp.job_posting_id, skill.name, 'JD_RULE_BASED', skill.score, skill.name, false, now(), now()
    FROM public.job_postings jp
    CROSS JOIN (VALUES ('Docker', 0.95), ('Kubernetes', 0.93), ('AWS', 0.88), ('CI/CD', 0.85), ('Linux', 0.80)) AS skill(name, score)
    WHERE jp.external_job_id = 'local-job-devops-001'
      AND NOT EXISTS (SELECT 1 FROM public.job_skill_tags t WHERE t.job_posting_id = jp.job_posting_id AND t.name = skill.name);

    -- job_skill_tags: local-job-ai-001 (Python, SQL, Spring Boot, Kafka, MLOps)
    INSERT INTO public.job_skill_tags (job_posting_id, name, source, confidence_score, matched_keyword, is_deleted, created_at, updated_at)
    SELECT jp.job_posting_id, skill.name, 'JD_RULE_BASED', skill.score, skill.name, false, now(), now()
    FROM public.job_postings jp
    CROSS JOIN (VALUES ('Python', 0.93), ('SQL', 0.90), ('Spring Boot', 0.85), ('Kafka', 0.88), ('MLOps', 0.82)) AS skill(name, score)
    WHERE jp.external_job_id = 'local-job-ai-001'
      AND NOT EXISTS (SELECT 1 FROM public.job_skill_tags t WHERE t.job_posting_id = jp.job_posting_id AND t.name = skill.name);

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
DO $$
BEGIN
    IF to_regclass('public.learner_notification') IS NULL THEN
        RETURN;
    END IF;

    -- TASK-31: 새 알림 타입 추가로 인해 체크 제약조건 갱신
    ALTER TABLE public.learner_notification
        DROP CONSTRAINT IF EXISTS learner_notification_type_check;

    ALTER TABLE public.learner_notification
        ADD CONSTRAINT learner_notification_type_check
        CHECK (type IN (
            'STUDY_GROUP', 'PLANNER', 'STREAK', 'PROJECT', 'SYSTEM',
            'MENTORING_ANSWER_CREATED', 'WORKSPACE_ANSWER_CREATED', 'PR_REVIEW_CREATED',
            'APPLICATION_APPROVED', 'APPLICATION_REJECTED',
            'SQUAD_INVITED', 'SQUAD_KICKED',
            'ASSIGNMENT_GRADED', 'MISSION_PASSED', 'MISSION_REJECTED',
            'RECOMMENDATION_ARRIVED', 'LOUNGE_APPLICATION_RECEIVED',
            'COMMUNITY_COMMENTED', 'REFUND_PROCESSED'
        ));
END $$;
^^^ END OF SCRIPT ^^^
DO $$
-- learner@devpath.com: 노드 클리어 + Proof Card 샘플 데이터
-- (인터넷 & 웹 기초, OS & 터미널 노드 — 채용 추천 테스트용)
-- project-schema-prep.sql은 매 서버 기동 시 실행되므로 WHERE NOT EXISTS 가드 필수
DECLARE
    v_user_id       bigint;
    v_roadmap_id    bigint;
    v_node_web_id   bigint;
    v_node_os_id    bigint;
    v_node_java_id  bigint;
BEGIN
    IF to_regclass('public.proof_cards') IS NULL
        OR to_regclass('public.node_clearances') IS NULL THEN
        RETURN;
    END IF;

    SELECT user_id INTO v_user_id FROM public.users WHERE email = 'learner@devpath.com' LIMIT 1;
    SELECT roadmap_id INTO v_roadmap_id FROM public.roadmaps WHERE title = 'Backend Master Roadmap' LIMIT 1;

    IF v_user_id IS NULL OR v_roadmap_id IS NULL THEN
        RETURN;
    END IF;

    SELECT node_id INTO v_node_web_id  FROM public.roadmap_nodes WHERE roadmap_id = v_roadmap_id AND title = '인터넷 & 웹 기초' LIMIT 1;
    SELECT node_id INTO v_node_os_id   FROM public.roadmap_nodes WHERE roadmap_id = v_roadmap_id AND title = 'OS & 터미널'      LIMIT 1;
    SELECT node_id INTO v_node_java_id FROM public.roadmap_nodes WHERE roadmap_id = v_roadmap_id AND title = 'Java 기초'        LIMIT 1;

    -- ── 1. node_clearances (CLEARED) ──────────────────────────────────────
    -- 인터넷 & 웹 기초
    IF v_node_web_id IS NOT NULL THEN
        INSERT INTO public.node_clearances
            (user_id, node_id, clearance_status, lesson_completion_rate,
             required_tags_satisfied, missing_tag_count,
             lesson_completed, quiz_passed, assignment_passed, proof_eligible,
             cleared_at, last_calculated_at, created_at, updated_at)
        SELECT v_user_id, v_node_web_id,
               'CLEARED', 1.00, TRUE, 0, TRUE, TRUE, TRUE, TRUE,
               TIMESTAMP '2026-04-01 10:00:00',
               TIMESTAMP '2026-04-01 10:00:00',
               TIMESTAMP '2026-04-01 10:00:00',
               TIMESTAMP '2026-04-01 10:00:00'
        WHERE NOT EXISTS (
            SELECT 1 FROM public.node_clearances
            WHERE user_id = v_user_id AND node_id = v_node_web_id
        );
    END IF;

    -- OS & 터미널
    IF v_node_os_id IS NOT NULL THEN
        INSERT INTO public.node_clearances
            (user_id, node_id, clearance_status, lesson_completion_rate,
             required_tags_satisfied, missing_tag_count,
             lesson_completed, quiz_passed, assignment_passed, proof_eligible,
             cleared_at, last_calculated_at, created_at, updated_at)
        SELECT v_user_id, v_node_os_id,
               'CLEARED', 1.00, TRUE, 0, TRUE, TRUE, TRUE, TRUE,
               TIMESTAMP '2026-04-01 11:00:00',
               TIMESTAMP '2026-04-01 11:00:00',
               TIMESTAMP '2026-04-01 11:00:00',
               TIMESTAMP '2026-04-01 11:00:00'
        WHERE NOT EXISTS (
            SELECT 1 FROM public.node_clearances
            WHERE user_id = v_user_id AND node_id = v_node_os_id
        );
    END IF;

    -- Java 기초 (기존 NOT_CLEARED → CLEARED 업데이트)
    IF v_node_java_id IS NOT NULL THEN
        UPDATE public.node_clearances
        SET clearance_status = 'CLEARED',
            lesson_completion_rate = 1.00,
            required_tags_satisfied = TRUE,
            missing_tag_count = 0,
            lesson_completed = TRUE,
            quiz_passed = TRUE,
            assignment_passed = TRUE,
            proof_eligible = TRUE,
            cleared_at = TIMESTAMP '2026-04-02 09:00:00',
            last_calculated_at = TIMESTAMP '2026-04-02 09:00:00',
            updated_at = TIMESTAMP '2026-04-02 09:00:00'
        WHERE user_id = v_user_id AND node_id = v_node_java_id
          AND clearance_status = 'NOT_CLEARED';
    END IF;

    -- ── 2. proof_cards ────────────────────────────────────────────────────
    -- 인터넷 & 웹 기초
    IF v_node_web_id IS NOT NULL THEN
        INSERT INTO public.proof_cards
            (user_id, node_id, node_clearance_id, title, description,
             proof_card_status, issued_at, created_at, updated_at)
        SELECT v_user_id, v_node_web_id, nc.node_clearance_id,
               '인터넷 & 웹 기초 Proof Card',
               '인터넷 & 웹 기초 학습 완료와 검증 조건 충족을 증명합니다.',
               'ISSUED',
               TIMESTAMP '2026-04-01 10:01:00',
               TIMESTAMP '2026-04-01 10:01:00',
               TIMESTAMP '2026-04-01 10:01:00'
        FROM public.node_clearances nc
        WHERE nc.user_id = v_user_id AND nc.node_id = v_node_web_id
          AND NOT EXISTS (
              SELECT 1 FROM public.proof_cards
              WHERE user_id = v_user_id AND node_id = v_node_web_id
          );
    END IF;

    -- OS & 터미널
    IF v_node_os_id IS NOT NULL THEN
        INSERT INTO public.proof_cards
            (user_id, node_id, node_clearance_id, title, description,
             proof_card_status, issued_at, created_at, updated_at)
        SELECT v_user_id, v_node_os_id, nc.node_clearance_id,
               'OS & 터미널 Proof Card',
               'OS & 터미널 학습 완료와 검증 조건 충족을 증명합니다.',
               'ISSUED',
               TIMESTAMP '2026-04-01 11:01:00',
               TIMESTAMP '2026-04-01 11:01:00',
               TIMESTAMP '2026-04-01 11:01:00'
        FROM public.node_clearances nc
        WHERE nc.user_id = v_user_id AND nc.node_id = v_node_os_id
          AND NOT EXISTS (
              SELECT 1 FROM public.proof_cards
              WHERE user_id = v_user_id AND node_id = v_node_os_id
          );
    END IF;

    -- Java 기초
    IF v_node_java_id IS NOT NULL THEN
        INSERT INTO public.proof_cards
            (user_id, node_id, node_clearance_id, title, description,
             proof_card_status, issued_at, created_at, updated_at)
        SELECT v_user_id, v_node_java_id, nc.node_clearance_id,
               'Java 기초 Proof Card',
               'Java 기초 학습 완료와 검증 조건 충족을 증명합니다.',
               'ISSUED',
               TIMESTAMP '2026-04-02 09:01:00',
               TIMESTAMP '2026-04-02 09:01:00',
               TIMESTAMP '2026-04-02 09:01:00'
        FROM public.node_clearances nc
        WHERE nc.user_id = v_user_id AND nc.node_id = v_node_java_id
          AND NOT EXISTS (
              SELECT 1 FROM public.proof_cards
              WHERE user_id = v_user_id AND node_id = v_node_java_id
          );
    END IF;

    -- ── 3. proof_card_tags ───────────────────────────────────────────────
    -- 인터넷 & 웹 기초 태그 (HTTP, DNS, 도메인, 웹 호스팅, 브라우저)
    INSERT INTO public.proof_card_tags (proof_card_id, tag_id, skill_evidence_type)
    SELECT pc.proof_card_id, t.tag_id, 'VERIFIED'
    FROM public.proof_cards pc
    JOIN public.tags t ON t.name IN ('HTTP', 'DNS', '도메인', '웹 호스팅', '브라우저')
    WHERE pc.user_id = v_user_id AND pc.node_id = v_node_web_id
      AND NOT EXISTS (
          SELECT 1 FROM public.proof_card_tags pct
          WHERE pct.proof_card_id = pc.proof_card_id AND pct.tag_id = t.tag_id
      );

    -- OS & 터미널 태그 (Linux, 프로세스 관리, 스레드, 메모리 관리, I/O 관리)
    INSERT INTO public.proof_card_tags (proof_card_id, tag_id, skill_evidence_type)
    SELECT pc.proof_card_id, t.tag_id, 'VERIFIED'
    FROM public.proof_cards pc
    JOIN public.tags t ON t.name IN ('Linux', '프로세스 관리', '스레드', '메모리 관리', 'I/O 관리')
    WHERE pc.user_id = v_user_id AND pc.node_id = v_node_os_id
      AND NOT EXISTS (
          SELECT 1 FROM public.proof_card_tags pct
          WHERE pct.proof_card_id = pc.proof_card_id AND pct.tag_id = t.tag_id
      );

    -- Java 기초 태그 (Java, OOP, 상속, 인터페이스, 제네릭)
    INSERT INTO public.proof_card_tags (proof_card_id, tag_id, skill_evidence_type)
    SELECT pc.proof_card_id, t.tag_id, 'VERIFIED'
    FROM public.proof_cards pc
    JOIN public.tags t ON t.name IN ('Java', 'OOP', '상속', '인터페이스', '제네릭')
    WHERE pc.user_id = v_user_id AND pc.node_id = v_node_java_id
      AND NOT EXISTS (
          SELECT 1 FROM public.proof_card_tags pct
          WHERE pct.proof_card_id = pc.proof_card_id AND pct.tag_id = t.tag_id
      );

END $$;
^^^ END OF SCRIPT ^^^

-- course_node_mappings: 샘플 강좌 → 로드맵 노드 매핑
DO $$
DECLARE
    v_course_sb_id bigint;
    v_course_jpa_id bigint;
    v_node_sb_id bigint;
    v_node_jpa_id bigint;
BEGIN
    IF to_regclass('public.course_node_mappings') IS NULL THEN RETURN; END IF;

    SELECT course_id INTO v_course_sb_id FROM public.courses WHERE title = 'Spring Boot Intro' LIMIT 1;
    SELECT course_id INTO v_course_jpa_id FROM public.courses WHERE title = 'JPA Practical Design' LIMIT 1;
    SELECT node_id INTO v_node_sb_id FROM public.roadmap_nodes WHERE title = 'Spring Boot & MVC' LIMIT 1;
    SELECT node_id INTO v_node_jpa_id FROM public.roadmap_nodes WHERE title = 'Spring Data JPA' LIMIT 1;

    IF v_course_sb_id IS NOT NULL AND v_node_sb_id IS NOT NULL THEN
        INSERT INTO public.course_node_mappings (course_id, node_id, created_at)
        SELECT v_course_sb_id, v_node_sb_id, NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM public.course_node_mappings
            WHERE course_id = v_course_sb_id AND node_id = v_node_sb_id
        );
    END IF;

    IF v_course_jpa_id IS NOT NULL AND v_node_jpa_id IS NOT NULL THEN
        INSERT INTO public.course_node_mappings (course_id, node_id, created_at)
        SELECT v_course_jpa_id, v_node_jpa_id, NOW()
        WHERE NOT EXISTS (
            SELECT 1 FROM public.course_node_mappings
            WHERE course_id = v_course_jpa_id AND node_id = v_node_jpa_id
        );
    END IF;
END $$;
^^^ END OF SCRIPT ^^^

-- learner_notification: is_deleted 컬럼 추가 (엔티티에 존재하나 기존 테이블에 누락)
DO $$
BEGIN
    IF to_regclass('public.learner_notification') IS NOT NULL THEN
        ALTER TABLE public.learner_notification ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false;
    END IF;
END $$;
^^^ END OF SCRIPT ^^^

-- proof_cards: course_id 컬럼 추가, node_id/node_clearance_id nullable 변경 (강좌 기반 ProofCard 발급 지원)
DO $$
BEGIN
    IF to_regclass('public.proof_cards') IS NOT NULL THEN
        ALTER TABLE public.proof_cards ADD COLUMN IF NOT EXISTS course_id BIGINT;
        ALTER TABLE public.proof_cards ALTER COLUMN node_id DROP NOT NULL;
        ALTER TABLE public.proof_cards ALTER COLUMN node_clearance_id DROP NOT NULL;
    END IF;
END $$;
^^^ END OF SCRIPT ^^^
