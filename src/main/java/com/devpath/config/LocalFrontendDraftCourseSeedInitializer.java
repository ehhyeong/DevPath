package com.devpath.config;

import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@Profile({"local", "dev"})
@Order(Ordered.HIGHEST_PRECEDENCE + 6)
@RequiredArgsConstructor
public class LocalFrontendDraftCourseSeedInitializer implements CommandLineRunner {

  private final JdbcTemplate jdbcTemplate;

  @Override
  @Transactional
  public void run(String... args) {
    if (!requiredTablesExist()) {
      return;
    }

    jdbcTemplate.execute(SEED_SQL);
  }

  private boolean requiredTablesExist() {
    return tableExists("users")
        && tableExists("courses")
        && tableExists("tags")
        && tableExists("course_tag_maps")
        && tableExists("course_prerequisites")
        && tableExists("course_job_relevance")
        && tableExists("course_objectives")
        && tableExists("course_target_audiences")
        && tableExists("course_info_section_items")
        && tableExists("course_sections")
        && tableExists("lessons")
        && tableExists("roadmaps")
        && tableExists("roadmap_nodes")
        && tableExists("course_node_mappings")
        && tableExists("quizzes")
        && tableExists("quiz_questions")
        && tableExists("quiz_question_options")
        && tableExists("assignments")
        && tableExists("assignment_rubrics");
  }

  private boolean tableExists(String tableName) {
    try {
      Integer count =
          jdbcTemplate.queryForObject(
              """
              SELECT COUNT(*)
              FROM information_schema.tables
              WHERE table_schema = 'public'
                AND table_name = ?
              """,
              Integer.class,
              tableName);
      return count != null && count > 0;
    } catch (DataAccessException ex) {
      return false;
    }
  }

  private static final String SEED_SQL =
      """
      DO $$
      DECLARE
        v_instructor_id bigint;
        v_course_id bigint;
        v_frontend_roadmap_id bigint;
        v_target_node_id bigint;
        v_eval_roadmap_id bigint;
        v_quiz_node_id bigint;
        v_assignment_node_id bigint;
        v_section1_id bigint;
        v_section2_id bigint;
        v_quiz_lesson_id bigint;
        v_assignment_lesson_id bigint;
        v_quiz_id bigint;
        v_assignment_id bigint;
        v_seed_question_id bigint;
        v_tag_name text;
        v_demo_video_url text := '/uploads/courses/127/lesson-video/321.mp4';
        v_demo_video_asset_key text := 'courses/127/lesson-video/321.mp4';
        v_demo_video_provider text := 'LOCAL';
        v_demo_video_duration_seconds integer := 34;
        v_previous_course_title text := 'Frontend Fundamentals: 로드맵으로 이해하는 프론트엔드 첫걸음';
        v_course_title text := 'HTML CSS JavaScript 렌더링 입문';
      BEGIN
        SELECT user_id
          INTO v_instructor_id
          FROM users
         WHERE email = 'frontend@devpath.com'
         LIMIT 1;

        IF v_instructor_id IS NULL THEN
          RETURN;
        END IF;

        FOREACH v_tag_name IN ARRAY ARRAY[
          'JavaScript',
          'CSS',
          'HTML',
          'Vite',
          '렌더링'
        ]
        LOOP
          IF EXISTS (SELECT 1 FROM tags WHERE name = v_tag_name) THEN
            UPDATE tags
               SET category = 'Frontend',
                   is_official = TRUE,
                   is_deleted = FALSE
             WHERE name = v_tag_name;
          ELSE
            INSERT INTO tags (name, category, is_official, is_deleted)
            VALUES (v_tag_name, 'Frontend', TRUE, FALSE);
          END IF;
        END LOOP;

        SELECT course_id
          INTO v_course_id
          FROM courses
         WHERE instructor_id = v_instructor_id
           AND title = ANY (ARRAY[v_course_title, v_previous_course_title])
         ORDER BY CASE WHEN title = v_course_title THEN 0 ELSE 1 END, course_id
         LIMIT 1;

        IF v_course_id IS NULL THEN
          INSERT INTO courses (
            instructor_id, title, subtitle, description,
            price, original_price, currency, difficulty_level, language,
            has_certificate, status, created_at, updated_at, published_at,
            thumbnail_url, intro_video_url, video_asset_key, duration_seconds
          )
          VALUES (
            v_instructor_id,
            v_course_title,
            '브라우저가 HTML, CSS, JavaScript를 화면으로 바꾸는 흐름을 첫 노드 기준으로 정리하는 입문 초안 강의',
            '프론트엔드 로드맵의 첫 번째 노드인 HTML CSS JavaScript 렌더링을 기준으로 브라우저가 문서와 스타일, 스크립트를 해석해 화면을 만드는 흐름을 정리하는 강의입니다.

이 강의는 HTML 문서 구조, CSS 캐스케이드와 레이아웃, JavaScript DOM 조작, Vite 개발 서버를 연결해 렌더링 결과가 언제 다시 계산되는지 확인하는 데 집중합니다. 이후 React 학습으로 넘어가기 전에 화면이 만들어지는 기본 흐름과 디버깅 기준을 먼저 잡습니다.',
            0.00,
            0.00,
            'KRW',
            'BEGINNER',
            'ko',
            FALSE,
            'DRAFT',
            NOW(),
            NOW(),
            NULL,
            'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
            NULL,
            NULL,
            0
          )
          RETURNING course_id INTO v_course_id;
        ELSE
          UPDATE courses
             SET title = v_course_title,
                 subtitle = '브라우저가 HTML, CSS, JavaScript를 화면으로 바꾸는 흐름을 첫 노드 기준으로 정리하는 입문 초안 강의',
                 description = '프론트엔드 로드맵의 첫 번째 노드인 HTML CSS JavaScript 렌더링을 기준으로 브라우저가 문서와 스타일, 스크립트를 해석해 화면을 만드는 흐름을 정리하는 강의입니다.

이 강의는 HTML 문서 구조, CSS 캐스케이드와 레이아웃, JavaScript DOM 조작, Vite 개발 서버를 연결해 렌더링 결과가 언제 다시 계산되는지 확인하는 데 집중합니다. 이후 React 학습으로 넘어가기 전에 화면이 만들어지는 기본 흐름과 디버깅 기준을 먼저 잡습니다.',
                 price = 0.00,
                 original_price = 0.00,
                 currency = 'KRW',
                 difficulty_level = 'BEGINNER',
                 language = 'ko',
                 has_certificate = FALSE,
                 status = CASE WHEN status = 'PUBLISHED' THEN 'PUBLISHED' ELSE 'DRAFT' END,
                 updated_at = NOW(),
                 published_at = CASE WHEN status = 'PUBLISHED' THEN COALESCE(published_at, NOW()) ELSE published_at END,
                 thumbnail_url = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
                 intro_video_url = NULL,
                 video_asset_key = NULL,
                 duration_seconds = 0
           WHERE course_id = v_course_id;
        END IF;

        DELETE FROM course_prerequisites WHERE course_id = v_course_id;
        DELETE FROM course_job_relevance WHERE course_id = v_course_id;
        DELETE FROM course_objectives WHERE course_id = v_course_id;
        DELETE FROM course_target_audiences WHERE course_id = v_course_id;
        DELETE FROM course_info_section_items WHERE course_id = v_course_id;
        DELETE FROM course_tag_maps WHERE course_id = v_course_id;
        DELETE FROM course_node_mappings WHERE course_id = v_course_id;

        INSERT INTO course_prerequisites (course_id, prerequisite)
        SELECT v_course_id, seed.item
          FROM (VALUES
            ('HTML 태그, CSS 선택자, JavaScript 변수와 함수의 아주 기본 문법을 본 적 있으면 충분합니다.'),
            ('브라우저 개발자 도구와 터미널에서 Vite 개발 서버를 실행할 수 있는 환경이 있으면 좋습니다.')
          ) AS seed(item)
         WHERE NOT EXISTS (
           SELECT 1
             FROM course_prerequisites cp
            WHERE cp.course_id = v_course_id
              AND cp.prerequisite = seed.item
         );

        INSERT INTO course_job_relevance (course_id, job_relevance)
        SELECT v_course_id, seed.item
          FROM (VALUES
            ('직무명: 프론트엔드 개발자; 영문명: Frontend Developer; 설명: HTML 구조, CSS 레이아웃, JavaScript 상호작용이 브라우저 화면으로 렌더링되는 원리를 이해합니다.; 키워드: HTML, CSS, JavaScript, 렌더링'),
            ('직무명: 웹 UI 엔지니어; 영문명: Web UI Engineer; 설명: DOM, CSSOM, 레이아웃, 페인트 흐름을 기준으로 UI 문제를 추적하고 설명하는 기본기를 정리합니다.; 키워드: DOM, CSSOM, 레이아웃, 페인트'),
            ('직무명: 주니어 프론트엔드 개발자; 영문명: Junior Frontend Developer; 설명: Vite 개발 서버에서 코드 변경이 화면에 반영되는 과정을 확인하고 디버깅 기준을 세웁니다.; 키워드: Vite, 개발 서버, DevTools, HMR')
          ) AS seed(item)
         WHERE NOT EXISTS (
           SELECT 1
             FROM course_job_relevance cjr
            WHERE cjr.course_id = v_course_id
              AND cjr.job_relevance = seed.item
         );

        INSERT INTO course_objectives (course_id, objective_text, display_order)
        SELECT v_course_id, seed.item, seed.display_order
          FROM (VALUES
            ('HTML이 DOM으로, CSS가 CSSOM으로 해석된 뒤 렌더 트리가 만들어지는 흐름을 설명할 수 있습니다.', 1),
            ('CSS 레이아웃과 페인트, JavaScript DOM 변경이 화면 갱신에 어떤 영향을 주는지 구분할 수 있습니다.', 2),
            ('Vite 개발 서버에서 간단한 페이지를 만들고 DevTools로 렌더링 결과를 확인할 수 있습니다.', 3)
          ) AS seed(item, display_order)
         WHERE NOT EXISTS (
           SELECT 1
             FROM course_objectives co
            WHERE co.course_id = v_course_id
              AND co.objective_text = seed.item
         );

        INSERT INTO course_target_audiences (course_id, audience_description, display_order)
        SELECT v_course_id, seed.item, seed.display_order
          FROM (VALUES
            ('프론트엔드 로드맵의 첫 노드에서 HTML, CSS, JavaScript가 어떻게 연결되는지 알고 싶은 입문자', 1),
            ('React를 배우기 전에 브라우저 렌더링과 Vite 개발 흐름을 먼저 잡고 싶은 학습자', 2)
          ) AS seed(item, display_order)
         WHERE NOT EXISTS (
           SELECT 1
             FROM course_target_audiences cta
            WHERE cta.course_id = v_course_id
              AND cta.audience_description = seed.item
         );

        INSERT INTO course_info_section_items (
          course_id, section_key, section_title, section_order, item_text, item_order
        )
        SELECT v_course_id, seed.section_key, seed.section_title, seed.section_order,
               seed.item_text, seed.item_order
          FROM (VALUES
            ('TARGET_AUDIENCE', '이런 분들께 추천합니다', 0, '프론트엔드 로드맵의 첫 노드에서 HTML, CSS, JavaScript가 어떻게 연결되는지 알고 싶은 입문자', 1),
            ('TARGET_AUDIENCE', '이런 분들께 추천합니다', 0, 'React를 배우기 전에 브라우저 렌더링과 Vite 개발 흐름을 먼저 잡고 싶은 학습자', 2),
            ('PREREQUISITES', '수강 전 알아두면 좋습니다', 1, 'HTML 태그, CSS 선택자, JavaScript 변수와 함수의 아주 기본 문법을 본 적 있으면 충분합니다.', 1),
            ('PREREQUISITES', '수강 전 알아두면 좋습니다', 1, '브라우저 개발자 도구와 터미널에서 Vite 개발 서버를 실행할 수 있는 환경이 있으면 좋습니다.', 2),
            ('OBJECTIVES', '이 강의를 끝내면', 2, 'HTML이 DOM으로, CSS가 CSSOM으로 해석된 뒤 렌더 트리가 만들어지는 흐름을 설명할 수 있습니다.', 1),
            ('OBJECTIVES', '이 강의를 끝내면', 2, 'CSS 레이아웃과 페인트, JavaScript DOM 변경이 화면 갱신에 어떤 영향을 주는지 구분할 수 있습니다.', 2),
            ('OBJECTIVES', '이 강의를 끝내면', 2, 'Vite 개발 서버에서 간단한 페이지를 만들고 DevTools로 렌더링 결과를 확인할 수 있습니다.', 3)
          ) AS seed(section_key, section_title, section_order, item_text, item_order)
         WHERE NOT EXISTS (
           SELECT 1
             FROM course_info_section_items cisi
            WHERE cisi.course_id = v_course_id
              AND cisi.section_key = seed.section_key
              AND cisi.item_text = seed.item_text
         );

        INSERT INTO course_tag_maps (course_id, tag_id, proficiency_level)
        SELECT v_course_id, t.tag_id, 1
          FROM tags t
         WHERE t.name = ANY (ARRAY[
           'JavaScript',
           'CSS',
           'HTML',
           'Vite',
           '렌더링'
         ])
           AND NOT EXISTS (
             SELECT 1
               FROM course_tag_maps ctm
              WHERE ctm.course_id = v_course_id
                AND ctm.tag_id = t.tag_id
           );

        UPDATE course_tag_maps ctm
           SET proficiency_level = 1
          FROM tags t
         WHERE ctm.tag_id = t.tag_id
           AND ctm.course_id = v_course_id
           AND t.name = ANY (ARRAY[
             'JavaScript',
             'CSS',
             'HTML',
             'Vite',
             '렌더링'
           ]);

        SELECT roadmap_id
          INTO v_frontend_roadmap_id
          FROM roadmaps
         WHERE title = '프론트엔드'
           AND is_deleted = FALSE
         ORDER BY is_official DESC, roadmap_id DESC
         LIMIT 1;

        SELECT node_id
          INTO v_target_node_id
          FROM roadmap_nodes
         WHERE roadmap_id = v_frontend_roadmap_id
         ORDER BY sort_order NULLS LAST, node_id
         LIMIT 1;

        IF v_target_node_id IS NOT NULL THEN
          INSERT INTO course_node_mappings (course_id, node_id, created_at)
          SELECT v_course_id, v_target_node_id, NOW()
           WHERE NOT EXISTS (
             SELECT 1
               FROM course_node_mappings cnm
              WHERE cnm.course_id = v_course_id
                AND cnm.node_id = v_target_node_id
           );
        END IF;

        SELECT section_id
          INTO v_section1_id
          FROM course_sections
         WHERE course_id = v_course_id
           AND title = ANY (ARRAY['HTML/CSS/JavaScript 렌더링 이해', '프론트엔드 로드맵 시작하기'])
         LIMIT 1;

        IF v_section1_id IS NULL THEN
          INSERT INTO course_sections (
            course_id, title, description, sort_order, is_published
          )
          VALUES (
            v_course_id,
            'HTML/CSS/JavaScript 렌더링 이해',
            'HTML 문서, CSS 스타일, JavaScript 실행이 브라우저 화면으로 이어지는 흐름을 정리합니다.',
            0,
            TRUE
          )
          RETURNING section_id INTO v_section1_id;
        ELSE
          UPDATE course_sections
             SET title = 'HTML/CSS/JavaScript 렌더링 이해',
                 description = 'HTML 문서, CSS 스타일, JavaScript 실행이 브라우저 화면으로 이어지는 흐름을 정리합니다.',
                 sort_order = 0,
                 is_published = TRUE
           WHERE section_id = v_section1_id;
        END IF;

        SELECT section_id
          INTO v_section2_id
          FROM course_sections
         WHERE course_id = v_course_id
           AND title = ANY (ARRAY['Vite로 렌더링 흐름 확인하기', '역할 정의와 학습 목표 설계'])
         LIMIT 1;

        UPDATE lessons
           SET title = '브라우저 렌더링 흐름과 HTML 구조'
         WHERE section_id = v_section1_id
           AND title = '프론트엔드가 제품에서 해결하는 문제';

        UPDATE lessons
           SET title = '퀴즈: HTML CSS JavaScript 렌더링 점검'
         WHERE section_id = v_section1_id
           AND title = '퀴즈: 프론트엔드 로드맵 이해 점검';

        UPDATE lessons
           SET title = 'Vite 개발 서버에서 DOM과 스타일 변경 관찰'
         WHERE section_id = v_section2_id
           AND title = '화면 개발자의 협업 범위와 산출물';

        UPDATE lessons
           SET title = '과제: 렌더링 흐름 미니 페이지 만들기'
         WHERE section_id = v_section2_id
           AND title = '과제: 나만의 프론트엔드 학습 로드맵 작성';

        IF NOT EXISTS (
          SELECT 1 FROM lessons
           WHERE section_id = v_section1_id
             AND title = '브라우저 렌더링 흐름과 HTML 구조'
        ) THEN
          INSERT INTO lessons (
            section_id, title, description, lesson_type, video_url,
            video_asset_key, video_provider, thumbnail_url, duration_seconds,
            is_preview, is_published, sort_order, quiz_node_id, assignment_node_id
          )
          VALUES (
            v_section1_id,
            '브라우저 렌더링 흐름과 HTML 구조',
            'HTML 파싱, DOM 생성, CSSOM 결합, 렌더 트리 구성까지 브라우저가 화면을 준비하는 흐름을 정리합니다.',
            'VIDEO',
            v_demo_video_url,
            v_demo_video_asset_key,
            v_demo_video_provider,
            NULL,
            v_demo_video_duration_seconds,
            FALSE,
            TRUE,
            0,
            NULL,
            NULL
          );
        ELSE
          UPDATE lessons
             SET description = 'HTML 파싱, DOM 생성, CSSOM 결합, 렌더 트리 구성까지 브라우저가 화면을 준비하는 흐름을 정리합니다.',
                 lesson_type = 'VIDEO',
                 video_url = v_demo_video_url,
                 video_asset_key = v_demo_video_asset_key,
                 video_provider = v_demo_video_provider,
                 thumbnail_url = NULL,
                 duration_seconds = v_demo_video_duration_seconds,
                 is_preview = FALSE,
                 is_published = TRUE,
                 sort_order = 0
           WHERE section_id = v_section1_id
             AND title = '브라우저 렌더링 흐름과 HTML 구조';
        END IF;

        SELECT lesson_id
          INTO v_quiz_lesson_id
          FROM lessons
         WHERE section_id = v_section1_id
           AND title = '퀴즈: HTML CSS JavaScript 렌더링 점검'
         LIMIT 1;

        IF v_quiz_lesson_id IS NULL THEN
          INSERT INTO lessons (
            section_id, title, description, lesson_type, video_url,
            video_asset_key, video_provider, thumbnail_url, duration_seconds,
            is_preview, is_published, sort_order, quiz_node_id, assignment_node_id
          )
          VALUES (
            v_section1_id,
            '퀴즈: HTML CSS JavaScript 렌더링 점검',
            '브라우저 렌더링 흐름, DOM/CSSOM, JavaScript 변경, Vite 실행 흐름을 스스로 점검합니다.',
            'READING',
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            FALSE,
            TRUE,
            1,
            NULL,
            NULL
          )
          RETURNING lesson_id INTO v_quiz_lesson_id;
        ELSE
          UPDATE lessons
             SET description = '브라우저 렌더링 흐름, DOM/CSSOM, JavaScript 변경, Vite 실행 흐름을 스스로 점검합니다.',
                 lesson_type = 'READING',
                 video_url = NULL,
                 video_asset_key = NULL,
                 video_provider = NULL,
                 thumbnail_url = NULL,
                 duration_seconds = NULL,
                 is_preview = FALSE,
                 is_published = TRUE,
                 sort_order = 1,
                 quiz_node_id = NULL
           WHERE lesson_id = v_quiz_lesson_id;
        END IF;

        IF v_section2_id IS NOT NULL THEN
          DELETE FROM lessons l
           WHERE l.section_id = v_section2_id
             AND l.title = 'Vite 개발 서버에서 DOM과 스타일 변경 관찰'
             AND NOT EXISTS (SELECT 1 FROM course_materials cm WHERE cm.lesson_id = l.lesson_id)
             AND NOT EXISTS (
               SELECT 1 FROM lesson_prerequisites lp
                WHERE lp.lesson_id = l.lesson_id
                   OR lp.prerequisite_lesson_id = l.lesson_id
             )
             AND NOT EXISTS (SELECT 1 FROM lesson_progress lp WHERE lp.lesson_id = l.lesson_id)
             AND NOT EXISTS (SELECT 1 FROM ocr_results ocr WHERE ocr.lesson_id = l.lesson_id)
             AND NOT EXISTS (SELECT 1 FROM til_drafts td WHERE td.lesson_id = l.lesson_id)
             AND NOT EXISTS (SELECT 1 FROM timestamp_notes tn WHERE tn.lesson_id = l.lesson_id);
        END IF;

        SELECT lesson_id
          INTO v_assignment_lesson_id
          FROM lessons
         WHERE title = '과제: 렌더링 흐름 미니 페이지 만들기'
           AND (
             section_id = v_section1_id
             OR (v_section2_id IS NOT NULL AND section_id = v_section2_id)
           )
         ORDER BY CASE WHEN section_id = v_section1_id THEN 0 ELSE 1 END, lesson_id
         LIMIT 1;

        IF v_assignment_lesson_id IS NULL THEN
          INSERT INTO lessons (
            section_id, title, description, lesson_type, video_url,
            video_asset_key, video_provider, thumbnail_url, duration_seconds,
            is_preview, is_published, sort_order, quiz_node_id, assignment_node_id
          )
          VALUES (
            v_section1_id,
            '과제: 렌더링 흐름 미니 페이지 만들기',
            'HTML, CSS, JavaScript, Vite를 사용해 렌더링 변화를 관찰할 수 있는 미니 페이지를 만듭니다.',
            'CODING',
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            FALSE,
            TRUE,
            2,
            NULL,
            NULL
          )
          RETURNING lesson_id INTO v_assignment_lesson_id;
        ELSE
          UPDATE lessons
             SET section_id = v_section1_id,
                 description = 'HTML, CSS, JavaScript, Vite를 사용해 렌더링 변화를 관찰할 수 있는 미니 페이지를 만듭니다.',
                 lesson_type = 'CODING',
                 video_url = NULL,
                 video_asset_key = NULL,
                 video_provider = NULL,
                 thumbnail_url = NULL,
                 duration_seconds = NULL,
                 is_preview = FALSE,
                 is_published = TRUE,
                 sort_order = 2
           WHERE lesson_id = v_assignment_lesson_id;
        END IF;

        IF v_section2_id IS NOT NULL THEN
          DELETE FROM course_sections cs
           WHERE cs.section_id = v_section2_id
             AND NOT EXISTS (SELECT 1 FROM lessons l WHERE l.section_id = cs.section_id);
        END IF;

        SELECT roadmap_id
          INTO v_eval_roadmap_id
          FROM roadmaps
         WHERE creator_id = v_instructor_id
           AND title = ANY (ARRAY['HTML CSS JavaScript 렌더링 초안 과제 워크스페이스', 'Frontend Fundamentals 초안 과제 워크스페이스'])
         LIMIT 1;

        IF v_eval_roadmap_id IS NULL THEN
          INSERT INTO roadmaps (
            title, description, info_title, info_content,
            creator_id, is_official, is_public, is_deleted, created_at
          )
          VALUES (
            'HTML CSS JavaScript 렌더링 초안 과제 워크스페이스',
            'HTML CSS JavaScript 렌더링 초안 강의의 퀴즈와 과제 편집 데이터를 보관하는 비공개 로드맵입니다.',
            NULL,
            NULL,
            v_instructor_id,
            FALSE,
            FALSE,
            FALSE,
            NOW()
          )
          RETURNING roadmap_id INTO v_eval_roadmap_id;
        ELSE
          UPDATE roadmaps
             SET title = 'HTML CSS JavaScript 렌더링 초안 과제 워크스페이스',
                 description = 'HTML CSS JavaScript 렌더링 초안 강의의 퀴즈와 과제 편집 데이터를 보관하는 비공개 로드맵입니다.',
                 is_official = FALSE,
                 is_public = FALSE,
                 is_deleted = FALSE
           WHERE roadmap_id = v_eval_roadmap_id;
        END IF;

        SELECT node_id
          INTO v_quiz_node_id
          FROM roadmap_nodes
         WHERE roadmap_id = v_eval_roadmap_id
           AND title = ANY (ARRAY['퀴즈: HTML CSS JavaScript 렌더링 점검', '퀴즈: 프론트엔드 로드맵 이해 점검'])
         LIMIT 1;

        IF v_quiz_node_id IS NULL THEN
          INSERT INTO roadmap_nodes (
            roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group
          )
          VALUES (
            v_eval_roadmap_id,
            '퀴즈: HTML CSS JavaScript 렌더링 점검',
            '프론트엔드 첫 노드인 HTML CSS JavaScript 렌더링 이해도를 점검하는 퀴즈 생성 노드입니다.',
            'COURSE_QUIZ',
            0,
            v_course_title,
            1
          )
          RETURNING node_id INTO v_quiz_node_id;
        ELSE
          UPDATE roadmap_nodes
             SET title = '퀴즈: HTML CSS JavaScript 렌더링 점검',
                 content = '프론트엔드 첫 노드인 HTML CSS JavaScript 렌더링 이해도를 점검하는 퀴즈 생성 노드입니다.',
                 node_type = 'COURSE_QUIZ',
                 sort_order = 0,
                 sub_topics = v_course_title,
                 branch_group = 1
           WHERE node_id = v_quiz_node_id;
        END IF;

        UPDATE lessons
           SET quiz_node_id = v_quiz_node_id
         WHERE lesson_id = v_quiz_lesson_id;

        INSERT INTO course_node_mappings (course_id, node_id, created_at)
        SELECT v_course_id, v_quiz_node_id, NOW()
         WHERE NOT EXISTS (
           SELECT 1
             FROM course_node_mappings cnm
            WHERE cnm.course_id = v_course_id
              AND cnm.node_id = v_quiz_node_id
         );

        SELECT quiz_id
          INTO v_quiz_id
          FROM quizzes
         WHERE node_id = v_quiz_node_id
           AND is_deleted = FALSE
         ORDER BY created_at DESC
         LIMIT 1;

        IF v_quiz_id IS NULL THEN
          INSERT INTO quizzes (
            node_id, title, description, quiz_type, total_score, pass_score,
            time_limit_minutes, is_published, is_active, expose_answer,
            expose_explanation, is_deleted, generation_keywords,
            generation_script, created_at, updated_at
          )
          VALUES (
            v_quiz_node_id,
            'HTML CSS JavaScript 렌더링 점검 퀴즈 초안',
            'HTML, CSS, JavaScript, Vite, 렌더링 흐름을 기준으로 문항을 생성하기 위한 비공개 초안입니다.',
            'AI_TOPIC',
            0,
            60,
            10,
            TRUE,
            TRUE,
            TRUE,
            TRUE,
            FALSE,
            'JavaScript,CSS,HTML,Vite,렌더링',
            '이번 강의는 프론트엔드 로드맵의 첫 번째 노드인 HTML CSS JavaScript 렌더링을 다룹니다. 목표는 브라우저가 코드를 화면으로 바꾸는 과정을 하나의 흐름으로 설명하고, 작은 코드 변경이 어떤 렌더링 결과를 만드는지 확인하는 것입니다.

브라우저는 HTML을 읽어 DOM 트리를 만들고, CSS를 읽어 CSSOM을 만듭니다. DOM과 CSSOM이 결합되면 실제로 화면에 그릴 요소와 스타일을 담은 렌더 트리가 만들어지고, 브라우저는 각 요소의 크기와 위치를 계산하는 레이아웃 단계를 거친 뒤 픽셀을 칠하는 페인트와 합성 과정을 수행합니다.

HTML은 문서의 의미와 구조를 담당합니다. 제목, 목록, 버튼, 입력 폼처럼 사용자가 인식하는 정보의 뼈대를 만들고, 접근성 도구가 화면을 이해할 수 있게 돕습니다. CSS는 그 구조에 시각 규칙을 부여합니다. 선택자, 박스 모델, flex 또는 grid 레이아웃, 반응형 규칙은 브라우저가 어디에 무엇을 배치할지 결정하는 데 직접 연결됩니다.

JavaScript는 이미 만들어진 DOM을 조회하거나 바꾸고, 이벤트에 반응해 텍스트, 클래스, 속성, 목록을 변경합니다. 이런 변경은 상황에 따라 스타일 재계산, 레이아웃, 페인트를 다시 일으킬 수 있습니다. 그래서 프론트엔드 입문자는 문법만이 아니라 어떤 코드가 화면 갱신을 만드는지 같이 봐야 합니다.

Vite는 이 흐름을 빠르게 확인하기 위한 개발 서버 역할을 합니다. 파일을 저장하면 개발 서버가 변경을 감지하고 브라우저에 반영합니다. DevTools의 Elements, Console, Network 패널을 함께 보면 HTML 구조, CSS 적용 여부, JavaScript 오류, 리소스 로딩 상태를 빠르게 추적할 수 있습니다.

이 노드를 마치면 학습자는 DOM, CSSOM, 렌더 트리, 레이아웃, 페인트의 순서를 설명하고, HTML/CSS/JavaScript/Vite가 각각 렌더링 흐름에서 맡는 역할을 구분할 수 있어야 합니다.',
            NOW(),
            NOW()
          )
          RETURNING quiz_id INTO v_quiz_id;
        ELSE
          UPDATE quizzes
             SET title = 'HTML CSS JavaScript 렌더링 점검 퀴즈 초안',
                 description = 'HTML, CSS, JavaScript, Vite, 렌더링 흐름을 기준으로 문항을 생성하기 위한 비공개 초안입니다.',
                 quiz_type = 'AI_TOPIC',
                 total_score = 0,
                 pass_score = 60,
                 time_limit_minutes = 10,
                 is_active = TRUE,
                 generation_keywords = 'JavaScript,CSS,HTML,Vite,렌더링',
                 generation_script = '이번 강의는 프론트엔드 로드맵의 첫 번째 노드인 HTML CSS JavaScript 렌더링을 다룹니다. 목표는 브라우저가 코드를 화면으로 바꾸는 과정을 하나의 흐름으로 설명하고, 작은 코드 변경이 어떤 렌더링 결과를 만드는지 확인하는 것입니다.

브라우저는 HTML을 읽어 DOM 트리를 만들고, CSS를 읽어 CSSOM을 만듭니다. DOM과 CSSOM이 결합되면 실제로 화면에 그릴 요소와 스타일을 담은 렌더 트리가 만들어지고, 브라우저는 각 요소의 크기와 위치를 계산하는 레이아웃 단계를 거친 뒤 픽셀을 칠하는 페인트와 합성 과정을 수행합니다.

HTML은 문서의 의미와 구조를 담당합니다. 제목, 목록, 버튼, 입력 폼처럼 사용자가 인식하는 정보의 뼈대를 만들고, 접근성 도구가 화면을 이해할 수 있게 돕습니다. CSS는 그 구조에 시각 규칙을 부여합니다. 선택자, 박스 모델, flex 또는 grid 레이아웃, 반응형 규칙은 브라우저가 어디에 무엇을 배치할지 결정하는 데 직접 연결됩니다.

JavaScript는 이미 만들어진 DOM을 조회하거나 바꾸고, 이벤트에 반응해 텍스트, 클래스, 속성, 목록을 변경합니다. 이런 변경은 상황에 따라 스타일 재계산, 레이아웃, 페인트를 다시 일으킬 수 있습니다. 그래서 프론트엔드 입문자는 문법만이 아니라 어떤 코드가 화면 갱신을 만드는지 같이 봐야 합니다.

Vite는 이 흐름을 빠르게 확인하기 위한 개발 서버 역할을 합니다. 파일을 저장하면 개발 서버가 변경을 감지하고 브라우저에 반영합니다. DevTools의 Elements, Console, Network 패널을 함께 보면 HTML 구조, CSS 적용 여부, JavaScript 오류, 리소스 로딩 상태를 빠르게 추적할 수 있습니다.

이 노드를 마치면 학습자는 DOM, CSSOM, 렌더 트리, 레이아웃, 페인트의 순서를 설명하고, HTML/CSS/JavaScript/Vite가 각각 렌더링 흐름에서 맡는 역할을 구분할 수 있어야 합니다.',
                 updated_at = NOW()
           WHERE quiz_id = v_quiz_id;
        END IF;

        IF NOT EXISTS (
          SELECT 1
            FROM quiz_questions
           WHERE quiz_id = v_quiz_id
             AND is_deleted = FALSE
        ) THEN
          UPDATE quizzes
             SET total_score = 30,
                 pass_score = 60,
                 is_published = TRUE,
                 is_active = TRUE,
                 expose_answer = TRUE,
                 expose_explanation = TRUE,
                 updated_at = NOW()
           WHERE quiz_id = v_quiz_id;

          INSERT INTO quiz_questions (
            quiz_id, question_type, question_text, explanation, points,
            display_order, source_timestamp, is_deleted, created_at, updated_at
          )
          VALUES (
            v_quiz_id,
            'MULTIPLE_CHOICE',
            '브라우저가 HTML과 CSS를 해석해 화면을 그리기 전까지의 흐름으로 가장 적절한 것은 무엇인가요?',
            'DOM과 CSSOM이 결합되어 렌더 트리가 만들어진 뒤 레이아웃과 페인트가 진행됩니다.',
            10,
            0,
            '00:05',
            FALSE,
            NOW(),
            NOW()
          )
          RETURNING question_id INTO v_seed_question_id;

          INSERT INTO quiz_question_options (
            question_id, option_text, is_correct, display_order, is_deleted, created_at, updated_at
          )
          VALUES
            (v_seed_question_id, 'HTML 파싱, DOM 생성, CSSOM 생성, 렌더 트리 구성, 레이아웃과 페인트 순서로 이어진다.', TRUE, 0, FALSE, NOW(), NOW()),
            (v_seed_question_id, 'CSSOM을 먼저 만들고 HTML은 화면에 그린 뒤 나중에 DOM으로 바꾼다.', FALSE, 1, FALSE, NOW(), NOW()),
            (v_seed_question_id, 'JavaScript가 실행되면 DOM과 CSSOM 없이 바로 픽셀이 그려진다.', FALSE, 2, FALSE, NOW(), NOW()),
            (v_seed_question_id, 'Vite가 브라우저의 렌더링 엔진을 대신 실행한다.', FALSE, 3, FALSE, NOW(), NOW());

          INSERT INTO quiz_questions (
            quiz_id, question_type, question_text, explanation, points,
            display_order, source_timestamp, is_deleted, created_at, updated_at
          )
          VALUES (
            v_quiz_id,
            'MULTIPLE_CHOICE',
            'JavaScript가 버튼 클릭 이벤트에서 DOM의 텍스트와 클래스를 바꾸면 어떤 일이 일어날 수 있나요?',
            'DOM이나 클래스 변경은 스타일 재계산과 레이아웃 또는 페인트를 다시 유발할 수 있습니다.',
            10,
            1,
            '00:18',
            FALSE,
            NOW(),
            NOW()
          )
          RETURNING question_id INTO v_seed_question_id;

          INSERT INTO quiz_question_options (
            question_id, option_text, is_correct, display_order, is_deleted, created_at, updated_at
          )
          VALUES
            (v_seed_question_id, '변경된 DOM과 스타일을 기준으로 스타일 재계산, 레이아웃 또는 페인트가 다시 일어날 수 있다.', TRUE, 0, FALSE, NOW(), NOW()),
            (v_seed_question_id, 'JavaScript는 렌더링 이후에는 화면에 아무 영향도 줄 수 없다.', FALSE, 1, FALSE, NOW(), NOW()),
            (v_seed_question_id, 'DOM 변경은 항상 서버를 다시 시작해야만 화면에 반영된다.', FALSE, 2, FALSE, NOW(), NOW()),
            (v_seed_question_id, '클래스 변경은 HTML 구조와 스타일 계산에 영향을 주지 않는다.', FALSE, 3, FALSE, NOW(), NOW());

          INSERT INTO quiz_questions (
            quiz_id, question_type, question_text, explanation, points,
            display_order, source_timestamp, is_deleted, created_at, updated_at
          )
          VALUES (
            v_quiz_id,
            'TRUE_FALSE',
            'Vite는 브라우저 렌더링 엔진을 바꾸는 도구다.',
            'Vite는 개발 서버와 번들링 도구이며 브라우저의 렌더링 엔진 자체를 바꾸지는 않습니다.',
            10,
            2,
            '00:27',
            FALSE,
            NOW(),
            NOW()
          )
          RETURNING question_id INTO v_seed_question_id;

          INSERT INTO quiz_question_options (
            question_id, option_text, is_correct, display_order, is_deleted, created_at, updated_at
          )
          VALUES
            (v_seed_question_id, '참', FALSE, 0, FALSE, NOW(), NOW()),
            (v_seed_question_id, '거짓', TRUE, 1, FALSE, NOW(), NOW());
        END IF;

        SELECT node_id
          INTO v_assignment_node_id
          FROM roadmap_nodes
         WHERE roadmap_id = v_eval_roadmap_id
           AND title = ANY (ARRAY['과제: 렌더링 흐름 미니 페이지 만들기', '과제: 나만의 프론트엔드 학습 로드맵 작성'])
         LIMIT 1;

        IF v_assignment_node_id IS NULL THEN
          INSERT INTO roadmap_nodes (
            roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group
          )
          VALUES (
            v_eval_roadmap_id,
            '과제: 렌더링 흐름 미니 페이지 만들기',
            'HTML, CSS, JavaScript, Vite를 사용해 렌더링 흐름을 확인하는 과제 노드입니다.',
            'COURSE_ASSIGNMENT',
            0,
            v_course_title,
            2
          )
          RETURNING node_id INTO v_assignment_node_id;
        ELSE
          UPDATE roadmap_nodes
             SET title = '과제: 렌더링 흐름 미니 페이지 만들기',
                 content = 'HTML, CSS, JavaScript, Vite를 사용해 렌더링 흐름을 확인하는 과제 노드입니다.',
                 node_type = 'COURSE_ASSIGNMENT',
                 sort_order = 0,
                 sub_topics = v_course_title,
                 branch_group = 2
           WHERE node_id = v_assignment_node_id;
        END IF;

        UPDATE lessons
           SET assignment_node_id = v_assignment_node_id
         WHERE lesson_id = v_assignment_lesson_id;

        INSERT INTO course_node_mappings (course_id, node_id, created_at)
        SELECT v_course_id, v_assignment_node_id, NOW()
         WHERE NOT EXISTS (
           SELECT 1
             FROM course_node_mappings cnm
            WHERE cnm.course_id = v_course_id
              AND cnm.node_id = v_assignment_node_id
         );

        SELECT assignment_id
          INTO v_assignment_id
          FROM assignments
         WHERE node_id = v_assignment_node_id
           AND is_deleted = FALSE
         ORDER BY created_at DESC
         LIMIT 1;

        IF v_assignment_id IS NULL THEN
          INSERT INTO assignments (
            node_id, title, description, submission_type, due_at,
            allowed_file_formats, readme_required, test_required, lint_required,
            submission_rule_description, total_score, pass_score,
            is_published, is_active, allow_late_submission, ai_review_enabled,
            allow_text_submission, allow_file_submission, allow_url_submission,
            is_deleted, created_at, updated_at
          )
          VALUES (
            v_assignment_node_id,
            'HTML/CSS/JavaScript 렌더링 흐름 미니 페이지 만들기',
            '프론트엔드 로드맵의 첫 번째 노드인 HTML CSS JavaScript 렌더링을 기준으로, Vite에서 실행되는 작은 페이지를 만들고 화면 갱신 흐름을 설명하는 과제입니다.

상황.
당신은 React를 배우기 전에 브라우저가 HTML, CSS, JavaScript를 어떻게 화면으로 바꾸는지 검증해야 하는 입문 프론트엔드 개발자입니다. 단순한 정적 페이지가 아니라, 버튼 클릭으로 DOM과 스타일이 바뀌는 장면을 만들어 렌더링 변화를 관찰해야 합니다.

요구사항.
1. Vite 프로젝트를 만들고 메인 화면에 header, main, section, button을 포함한 의미 있는 HTML 구조를 구성하세요.
2. CSS로 카드 목록 또는 상태 패널을 배치하고, hover 또는 active 상태가 보이도록 스타일을 작성하세요.
3. JavaScript로 버튼 클릭 시 텍스트, 클래스, 목록 중 2가지 이상이 DOM에서 바뀌게 만드세요.
4. index.html 안의 주석 또는 화면 하단 설명 영역에 DOM, CSSOM, 렌더 트리, 레이아웃, 페인트를 한 문장씩 정리하세요.
5. DevTools Elements 또는 Console에서 확인한 내용을 HTML 주석이나 화면 하단 설명 영역에 짧게 남기세요.

제출물.
index.html 파일 하나만 업로드하세요. 외부 링크나 텍스트 직접 입력은 사용하지 않습니다. HTML 파일 안에 구조, 스타일, 스크립트, 렌더링 흐름 설명, DevTools 확인 기록을 모두 포함하세요.',
            'FILE',
            NULL,
            'html',
            FALSE,
            FALSE,
            FALSE,
            'index.html 파일 하나로 제출하세요. 파일 안에는 HTML 구조, CSS 레이아웃과 상태 스타일, JavaScript DOM 변경 코드, DOM/CSSOM/렌더 트리/레이아웃/페인트 설명 주석, DevTools 확인 기록을 포함하세요.',
            100,
            80,
            TRUE,
            TRUE,
            FALSE,
            TRUE,
            FALSE,
            TRUE,
            FALSE,
            FALSE,
            NOW(),
            NOW()
          )
          RETURNING assignment_id INTO v_assignment_id;
        ELSE
          UPDATE assignments
             SET title = 'HTML/CSS/JavaScript 렌더링 흐름 미니 페이지 만들기',
                 description = '프론트엔드 로드맵의 첫 번째 노드인 HTML CSS JavaScript 렌더링을 기준으로, Vite에서 실행되는 작은 페이지를 만들고 화면 갱신 흐름을 설명하는 과제입니다.

상황.
당신은 React를 배우기 전에 브라우저가 HTML, CSS, JavaScript를 어떻게 화면으로 바꾸는지 검증해야 하는 입문 프론트엔드 개발자입니다. 단순한 정적 페이지가 아니라, 버튼 클릭으로 DOM과 스타일이 바뀌는 장면을 만들어 렌더링 변화를 관찰해야 합니다.

요구사항.
1. Vite 프로젝트를 만들고 메인 화면에 header, main, section, button을 포함한 의미 있는 HTML 구조를 구성하세요.
2. CSS로 카드 목록 또는 상태 패널을 배치하고, hover 또는 active 상태가 보이도록 스타일을 작성하세요.
3. JavaScript로 버튼 클릭 시 텍스트, 클래스, 목록 중 2가지 이상이 DOM에서 바뀌게 만드세요.
4. index.html 안의 주석 또는 화면 하단 설명 영역에 DOM, CSSOM, 렌더 트리, 레이아웃, 페인트를 한 문장씩 정리하세요.
5. DevTools Elements 또는 Console에서 확인한 내용을 HTML 주석이나 화면 하단 설명 영역에 짧게 남기세요.

제출물.
index.html 파일 하나만 업로드하세요. 외부 링크나 텍스트 직접 입력은 사용하지 않습니다. HTML 파일 안에 구조, 스타일, 스크립트, 렌더링 흐름 설명, DevTools 확인 기록을 모두 포함하세요.',
                 submission_type = 'FILE',
                 due_at = NULL,
                 allowed_file_formats = 'html',
                 readme_required = FALSE,
                 test_required = FALSE,
                 lint_required = FALSE,
                 submission_rule_description = 'index.html 파일 하나로 제출하세요. 파일 안에는 HTML 구조, CSS 레이아웃과 상태 스타일, JavaScript DOM 변경 코드, DOM/CSSOM/렌더 트리/레이아웃/페인트 설명 주석, DevTools 확인 기록을 포함하세요.',
                 total_score = 100,
                 pass_score = 80,
                 is_published = TRUE,
                 is_active = TRUE,
                 allow_late_submission = FALSE,
                 ai_review_enabled = TRUE,
                 allow_text_submission = FALSE,
                 allow_file_submission = TRUE,
                 allow_url_submission = FALSE,
                 updated_at = NOW()
           WHERE assignment_id = v_assignment_id;
        END IF;

        DELETE FROM assignment_rubrics
         WHERE assignment_id = v_assignment_id;

        INSERT INTO assignment_rubrics (
          assignment_id, criteria_name, criteria_description,
          max_points, display_order, is_deleted, created_at, updated_at
        )
        SELECT v_assignment_id, seed.criteria_name, seed.criteria_description,
               seed.max_points, seed.display_order, FALSE, NOW(), NOW()
          FROM (VALUES
            ('HTML 구조와 의미 요소', 'header, main, section, button 등 의미 있는 구조를 사용하고 화면 정보의 계층이 명확합니다.', 25, 1),
            ('CSS 레이아웃과 상태 표현', '박스 모델, flex 또는 grid, hover 또는 active 상태를 활용해 렌더링 결과가 분명하게 보입니다.', 25, 2),
            ('JavaScript DOM 이벤트와 화면 갱신', '이벤트 처리로 텍스트, 클래스, 목록 중 2가지 이상을 변경하고 화면 갱신 원리를 설명했습니다.', 30, 3),
            ('렌더링 흐름 설명과 DevTools 기록', 'DOM, CSSOM, 렌더 트리, 레이아웃, 페인트 설명과 DevTools 확인 기록이 HTML 파일 안에 정리되었습니다.', 20, 4)
          ) AS seed(criteria_name, criteria_description, max_points, display_order)
        ;
      END $$;
      """;
}
