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
        v_tag_name text;
        v_course_title text := 'Frontend Fundamentals: 로드맵으로 이해하는 프론트엔드 첫걸음';
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
          'Frontend Fundamentals',
          'Frontend',
          'Frontend 개요',
          '로드맵 이해',
          '역할 정의',
          '학습 목표'
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
           AND title = v_course_title
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
            '프론트엔드의 역할, 로드맵 구조, 학습 목표를 첫 노드 기준으로 정리하는 입문 초안 강의',
            '프론트엔드 학습을 시작하기 전에 화면 개발자가 실제 제품에서 어떤 문제를 해결하는지, 로드맵의 첫 노드를 어떻게 읽어야 하는지, 앞으로의 학습 목표를 어떻게 쪼개야 하는지 정리하는 강의입니다.

이 강의는 HTML/CSS/JavaScript 세부 문법을 깊게 들어가기보다 프론트엔드 직무의 역할, 협업 범위, 학습 순서, 결과물 기준을 먼저 잡는 데 집중합니다. 이후 React, Next.js, 상태 관리, 테스트 학습으로 넘어가기 전에 방향을 잃지 않도록 개인 학습 계획과 산출물 체크리스트를 함께 만듭니다.',
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
             SET subtitle = '프론트엔드의 역할, 로드맵 구조, 학습 목표를 첫 노드 기준으로 정리하는 입문 초안 강의',
                 description = '프론트엔드 학습을 시작하기 전에 화면 개발자가 실제 제품에서 어떤 문제를 해결하는지, 로드맵의 첫 노드를 어떻게 읽어야 하는지, 앞으로의 학습 목표를 어떻게 쪼개야 하는지 정리하는 강의입니다.

이 강의는 HTML/CSS/JavaScript 세부 문법을 깊게 들어가기보다 프론트엔드 직무의 역할, 협업 범위, 학습 순서, 결과물 기준을 먼저 잡는 데 집중합니다. 이후 React, Next.js, 상태 관리, 테스트 학습으로 넘어가기 전에 방향을 잃지 않도록 개인 학습 계획과 산출물 체크리스트를 함께 만듭니다.',
                 price = 0.00,
                 original_price = 0.00,
                 currency = 'KRW',
                 difficulty_level = 'BEGINNER',
                 language = 'ko',
                 has_certificate = FALSE,
                 status = 'DRAFT',
                 updated_at = NOW(),
                 published_at = NULL,
                 thumbnail_url = 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
                 intro_video_url = NULL,
                 video_asset_key = NULL,
                 duration_seconds = 0
           WHERE course_id = v_course_id;
        END IF;

        INSERT INTO course_prerequisites (course_id, prerequisite)
        SELECT v_course_id, seed.item
          FROM (VALUES
            ('HTML, CSS, JavaScript를 아직 깊게 몰라도 수강할 수 있습니다.'),
            ('프론트엔드 직무와 학습 순서를 먼저 정리하고 싶은 학습자에게 맞습니다.')
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
            ('직무명: 프론트엔드 개발자; 영문명: Frontend Developer; 설명: 제품 화면을 구현하고 사용자 경험, 상태, API 연동을 책임지는 역할을 이해합니다.; 키워드: UI 구현, 사용자 경험, API 연동, 협업'),
            ('직무명: 웹 UI 엔지니어; 영문명: Web UI Engineer; 설명: 디자인 시안을 접근성과 유지보수성을 고려한 웹 인터페이스로 옮기는 기본 관점을 정리합니다.; 키워드: HTML, CSS, JavaScript, 접근성'),
            ('직무명: 주니어 프론트엔드 개발자; 영문명: Junior Frontend Developer; 설명: React 또는 Next.js 학습 전에 필요한 로드맵 기반 학습 계획과 산출물 기준을 세웁니다.; 키워드: 로드맵, 학습 계획, 산출물, 체크리스트')
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
            ('프론트엔드 개발자가 제품에서 맡는 책임과 협업 지점을 설명할 수 있습니다.', 1),
            ('로드맵 첫 노드를 기준으로 학습 목표와 산출물을 작은 단위로 쪼갤 수 있습니다.', 2),
            ('개인 학습 계획과 체크리스트를 만들어 다음 강의 학습으로 이어갈 수 있습니다.', 3)
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
            ('프론트엔드 로드맵을 처음 펼쳐 보고 어디서 시작할지 막히는 입문자', 1),
            ('React나 Next.js를 배우기 전에 화면 개발자의 역할을 먼저 정리하고 싶은 학습자', 2)
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
            ('TARGET_AUDIENCE', '이런 분들께 추천합니다', 0, '프론트엔드 로드맵을 처음 펼쳐 보고 어디서 시작할지 막히는 입문자', 1),
            ('TARGET_AUDIENCE', '이런 분들께 추천합니다', 0, 'React나 Next.js를 배우기 전에 화면 개발자의 역할을 먼저 정리하고 싶은 학습자', 2),
            ('PREREQUISITES', '수강 전 알아두면 좋습니다', 1, 'HTML, CSS, JavaScript를 아직 깊게 몰라도 수강할 수 있습니다.', 1),
            ('PREREQUISITES', '수강 전 알아두면 좋습니다', 1, '프론트엔드 직무와 학습 순서를 먼저 정리하고 싶은 학습자에게 맞습니다.', 2),
            ('OBJECTIVES', '이 강의를 끝내면', 2, '프론트엔드 개발자가 제품에서 맡는 책임과 협업 지점을 설명할 수 있습니다.', 1),
            ('OBJECTIVES', '이 강의를 끝내면', 2, '로드맵 첫 노드를 기준으로 학습 목표와 산출물을 작은 단위로 쪼갤 수 있습니다.', 2),
            ('OBJECTIVES', '이 강의를 끝내면', 2, '개인 학습 계획과 체크리스트를 만들어 다음 강의 학습으로 이어갈 수 있습니다.', 3)
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
           'Frontend Fundamentals',
           'Frontend',
           'Frontend 개요',
           '로드맵 이해',
           '역할 정의',
           '학습 목표'
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
             'Frontend Fundamentals',
             'Frontend',
             'Frontend 개요',
             '로드맵 이해',
             '역할 정의',
             '학습 목표'
           ]);

        SELECT node_id
          INTO v_target_node_id
          FROM roadmap_nodes
         WHERE roadmap_id = 5
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
           AND title = '프론트엔드 로드맵 시작하기'
         LIMIT 1;

        IF v_section1_id IS NULL THEN
          INSERT INTO course_sections (
            course_id, title, description, sort_order, is_published
          )
          VALUES (
            v_course_id,
            '프론트엔드 로드맵 시작하기',
            '로드맵 첫 노드의 의미와 프론트엔드 직무가 다루는 문제를 정리합니다.',
            0,
            FALSE
          )
          RETURNING section_id INTO v_section1_id;
        ELSE
          UPDATE course_sections
             SET description = '로드맵 첫 노드의 의미와 프론트엔드 직무가 다루는 문제를 정리합니다.',
                 sort_order = 0,
                 is_published = FALSE
           WHERE section_id = v_section1_id;
        END IF;

        SELECT section_id
          INTO v_section2_id
          FROM course_sections
         WHERE course_id = v_course_id
           AND title = '역할 정의와 학습 목표 설계'
         LIMIT 1;

        IF v_section2_id IS NULL THEN
          INSERT INTO course_sections (
            course_id, title, description, sort_order, is_published
          )
          VALUES (
            v_course_id,
            '역할 정의와 학습 목표 설계',
            '프론트엔드 개발자의 협업 범위와 개인 학습 목표를 실제 산출물로 정리합니다.',
            1,
            FALSE
          )
          RETURNING section_id INTO v_section2_id;
        ELSE
          UPDATE course_sections
             SET description = '프론트엔드 개발자의 협업 범위와 개인 학습 목표를 실제 산출물로 정리합니다.',
                 sort_order = 1,
                 is_published = FALSE
           WHERE section_id = v_section2_id;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM lessons
           WHERE section_id = v_section1_id
             AND title = '프론트엔드가 제품에서 해결하는 문제'
        ) THEN
          INSERT INTO lessons (
            section_id, title, description, lesson_type, video_url,
            video_asset_key, video_provider, thumbnail_url, duration_seconds,
            is_preview, is_published, sort_order, quiz_node_id, assignment_node_id
          )
          VALUES (
            v_section1_id,
            '프론트엔드가 제품에서 해결하는 문제',
            '사용자 경험, 화면 상태, API 연동, 접근성 관점에서 프론트엔드의 역할을 정리합니다.',
            'VIDEO',
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            FALSE,
            FALSE,
            0,
            NULL,
            NULL
          );
        ELSE
          UPDATE lessons
             SET description = '사용자 경험, 화면 상태, API 연동, 접근성 관점에서 프론트엔드의 역할을 정리합니다.',
                 lesson_type = 'VIDEO',
                 video_url = NULL,
                 video_asset_key = NULL,
                 video_provider = NULL,
                 thumbnail_url = NULL,
                 duration_seconds = NULL,
                 is_preview = FALSE,
                 is_published = FALSE,
                 sort_order = 0
           WHERE section_id = v_section1_id
             AND title = '프론트엔드가 제품에서 해결하는 문제';
        END IF;

        SELECT lesson_id
          INTO v_quiz_lesson_id
          FROM lessons
         WHERE section_id = v_section1_id
           AND title = '퀴즈: 프론트엔드 로드맵 이해 점검'
         LIMIT 1;

        IF v_quiz_lesson_id IS NULL THEN
          INSERT INTO lessons (
            section_id, title, description, lesson_type, video_url,
            video_asset_key, video_provider, thumbnail_url, duration_seconds,
            is_preview, is_published, sort_order, quiz_node_id, assignment_node_id
          )
          VALUES (
            v_section1_id,
            '퀴즈: 프론트엔드 로드맵 이해 점검',
            '로드맵 첫 노드에서 확인해야 할 핵심 개념과 학습 순서를 스스로 점검합니다.',
            'READING',
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            FALSE,
            FALSE,
            1,
            NULL,
            NULL
          )
          RETURNING lesson_id INTO v_quiz_lesson_id;
        ELSE
          UPDATE lessons
             SET description = '로드맵 첫 노드에서 확인해야 할 핵심 개념과 학습 순서를 스스로 점검합니다.',
                 lesson_type = 'READING',
                 video_url = NULL,
                 video_asset_key = NULL,
                 video_provider = NULL,
                 thumbnail_url = NULL,
                 duration_seconds = NULL,
                 is_preview = FALSE,
                 is_published = FALSE,
                 sort_order = 1,
                 quiz_node_id = NULL
           WHERE lesson_id = v_quiz_lesson_id;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM lessons
           WHERE section_id = v_section2_id
             AND title = '화면 개발자의 협업 범위와 산출물'
        ) THEN
          INSERT INTO lessons (
            section_id, title, description, lesson_type, video_url,
            video_asset_key, video_provider, thumbnail_url, duration_seconds,
            is_preview, is_published, sort_order, quiz_node_id, assignment_node_id
          )
          VALUES (
            v_section2_id,
            '화면 개발자의 협업 범위와 산출물',
            '디자인, 백엔드, QA와 맞춰야 하는 프론트엔드 산출물과 의사결정 기준을 다룹니다.',
            'VIDEO',
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            FALSE,
            FALSE,
            0,
            NULL,
            NULL
          );
        ELSE
          UPDATE lessons
             SET description = '디자인, 백엔드, QA와 맞춰야 하는 프론트엔드 산출물과 의사결정 기준을 다룹니다.',
                 lesson_type = 'VIDEO',
                 video_url = NULL,
                 video_asset_key = NULL,
                 video_provider = NULL,
                 thumbnail_url = NULL,
                 duration_seconds = NULL,
                 is_preview = FALSE,
                 is_published = FALSE,
                 sort_order = 0
           WHERE section_id = v_section2_id
             AND title = '화면 개발자의 협업 범위와 산출물';
        END IF;

        SELECT lesson_id
          INTO v_assignment_lesson_id
          FROM lessons
         WHERE section_id = v_section2_id
           AND title = '과제: 나만의 프론트엔드 학습 로드맵 작성'
         LIMIT 1;

        IF v_assignment_lesson_id IS NULL THEN
          INSERT INTO lessons (
            section_id, title, description, lesson_type, video_url,
            video_asset_key, video_provider, thumbnail_url, duration_seconds,
            is_preview, is_published, sort_order, quiz_node_id, assignment_node_id
          )
          VALUES (
            v_section2_id,
            '과제: 나만의 프론트엔드 학습 로드맵 작성',
            '로드맵 첫 노드를 기준으로 2주 학습 계획과 산출물 체크리스트를 작성합니다.',
            'CODING',
            NULL,
            NULL,
            NULL,
            NULL,
            NULL,
            FALSE,
            FALSE,
            1,
            NULL,
            NULL
          )
          RETURNING lesson_id INTO v_assignment_lesson_id;
        ELSE
          UPDATE lessons
             SET description = '로드맵 첫 노드를 기준으로 2주 학습 계획과 산출물 체크리스트를 작성합니다.',
                 lesson_type = 'CODING',
                 video_url = NULL,
                 video_asset_key = NULL,
                 video_provider = NULL,
                 thumbnail_url = NULL,
                 duration_seconds = NULL,
                 is_preview = FALSE,
                 is_published = FALSE,
                 sort_order = 1
           WHERE lesson_id = v_assignment_lesson_id;
        END IF;

        SELECT roadmap_id
          INTO v_eval_roadmap_id
          FROM roadmaps
         WHERE creator_id = v_instructor_id
           AND title = 'Frontend Fundamentals 초안 과제 워크스페이스'
         LIMIT 1;

        IF v_eval_roadmap_id IS NULL THEN
          INSERT INTO roadmaps (
            title, description, info_title, info_content,
            creator_id, is_official, is_public, is_deleted, created_at
          )
          VALUES (
            'Frontend Fundamentals 초안 과제 워크스페이스',
            'Frontend Fundamentals 초안 강의의 과제 편집 데이터를 보관하는 비공개 로드맵입니다.',
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
             SET description = 'Frontend Fundamentals 초안 강의의 과제 편집 데이터를 보관하는 비공개 로드맵입니다.',
                 is_official = FALSE,
                 is_public = FALSE,
                 is_deleted = FALSE
           WHERE roadmap_id = v_eval_roadmap_id;
        END IF;

        SELECT node_id
          INTO v_quiz_node_id
          FROM roadmap_nodes
         WHERE roadmap_id = v_eval_roadmap_id
           AND title = '퀴즈: 프론트엔드 로드맵 이해 점검'
         LIMIT 1;

        IF v_quiz_node_id IS NULL THEN
          INSERT INTO roadmap_nodes (
            roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group
          )
          VALUES (
            v_eval_roadmap_id,
            '퀴즈: 프론트엔드 로드맵 이해 점검',
            '프론트엔드 로드맵 첫 노드와 직무 역할 이해도를 점검하는 퀴즈 생성 노드입니다.',
            'COURSE_QUIZ',
            0,
            v_course_title,
            1
          )
          RETURNING node_id INTO v_quiz_node_id;
        ELSE
          UPDATE roadmap_nodes
             SET content = '프론트엔드 로드맵 첫 노드와 직무 역할 이해도를 점검하는 퀴즈 생성 노드입니다.',
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
            '프론트엔드 로드맵 이해 점검 퀴즈 초안',
            '프론트엔드 역할, 로드맵 첫 노드, 학습 목표를 기준으로 문항을 생성하기 위한 비공개 초안입니다.',
            'AI_TOPIC',
            0,
            60,
            10,
            FALSE,
            TRUE,
            FALSE,
            FALSE,
            FALSE,
            'Frontend Fundamentals,Frontend,Frontend 개요,로드맵 이해,역할 정의,학습 목표',
            '오늘 강의에서는 프론트엔드 학습을 시작하기 전에 먼저 “프론트엔드가 제품에서 어떤 문제를 해결하는 역할인지”를 정리합니다.

프론트엔드는 단순히 화면을 예쁘게 만드는 사람이 아니라, 사용자가 제품을 이해하고 원하는 행동을 문제없이 완료할 수 있도록 화면 구조, 상호작용, 상태 변화, API 연동, 접근성, 성능을 함께 책임지는 역할입니다. 버튼 하나를 배치할 때도 클릭 후 상태가 어떻게 바뀌는지, 실패했을 때 어떤 안내를 보여줄지, 백엔드 응답이 늦을 때 사용자가 무엇을 보게 될지까지 고려해야 합니다.

로드맵의 첫 번째 노드는 이 역할을 이해하고 앞으로의 학습 순서를 잡는 출발점입니다. HTML, CSS, JavaScript 같은 기술 이름을 외우기 전에 “내가 어떤 문제를 해결하기 위해 이 기술을 배우는가”를 먼저 정의해야 합니다. 화면 구조를 잡기 위해 HTML을 배우고, 시각적 규칙과 반응형 레이아웃을 만들기 위해 CSS를 배우며, 사용자 행동과 데이터 변화를 처리하기 위해 JavaScript를 배웁니다.

프론트엔드 개발자는 디자이너와는 화면 의도와 상태별 UI를 맞추고, 백엔드 개발자와는 API 계약과 에러 응답을 맞추며, QA와는 재현 조건과 기대 동작을 확인합니다. 따라서 좋은 학습 목표는 “문법을 안다”가 아니라 “로그인 화면의 성공, 실패, 로딩 상태를 설명하고 구현할 수 있다”처럼 확인 가능한 산출물로 표현되어야 합니다.

이번 강의의 학습 목표는 세 가지입니다. 첫째, 프론트엔드 개발자의 책임 범위를 설명할 수 있습니다. 둘째, 로드맵 첫 노드에서 무엇을 먼저 확인해야 하는지 말할 수 있습니다. 셋째, 다음 학습으로 넘어가기 전에 만들 산출물과 체크리스트를 직접 정의할 수 있습니다.',
            NOW(),
            NOW()
          )
          RETURNING quiz_id INTO v_quiz_id;
        ELSE
          UPDATE quizzes
             SET generation_keywords =
                   CASE
                     WHEN generation_keywords IS NULL OR btrim(generation_keywords) = ''
                       THEN 'Frontend Fundamentals,Frontend,Frontend 개요,로드맵 이해,역할 정의,학습 목표'
                     ELSE generation_keywords
                   END,
                 generation_script =
                   CASE
                     WHEN generation_script IS NULL OR btrim(generation_script) = ''
                       THEN '오늘 강의에서는 프론트엔드 학습을 시작하기 전에 먼저 “프론트엔드가 제품에서 어떤 문제를 해결하는 역할인지”를 정리합니다.

프론트엔드는 단순히 화면을 예쁘게 만드는 사람이 아니라, 사용자가 제품을 이해하고 원하는 행동을 문제없이 완료할 수 있도록 화면 구조, 상호작용, 상태 변화, API 연동, 접근성, 성능을 함께 책임지는 역할입니다. 버튼 하나를 배치할 때도 클릭 후 상태가 어떻게 바뀌는지, 실패했을 때 어떤 안내를 보여줄지, 백엔드 응답이 늦을 때 사용자가 무엇을 보게 될지까지 고려해야 합니다.

로드맵의 첫 번째 노드는 이 역할을 이해하고 앞으로의 학습 순서를 잡는 출발점입니다. HTML, CSS, JavaScript 같은 기술 이름을 외우기 전에 “내가 어떤 문제를 해결하기 위해 이 기술을 배우는가”를 먼저 정의해야 합니다. 화면 구조를 잡기 위해 HTML을 배우고, 시각적 규칙과 반응형 레이아웃을 만들기 위해 CSS를 배우며, 사용자 행동과 데이터 변화를 처리하기 위해 JavaScript를 배웁니다.

프론트엔드 개발자는 디자이너와는 화면 의도와 상태별 UI를 맞추고, 백엔드 개발자와는 API 계약과 에러 응답을 맞추며, QA와는 재현 조건과 기대 동작을 확인합니다. 따라서 좋은 학습 목표는 “문법을 안다”가 아니라 “로그인 화면의 성공, 실패, 로딩 상태를 설명하고 구현할 수 있다”처럼 확인 가능한 산출물로 표현되어야 합니다.

이번 강의의 학습 목표는 세 가지입니다. 첫째, 프론트엔드 개발자의 책임 범위를 설명할 수 있습니다. 둘째, 로드맵 첫 노드에서 무엇을 먼저 확인해야 하는지 말할 수 있습니다. 셋째, 다음 학습으로 넘어가기 전에 만들 산출물과 체크리스트를 직접 정의할 수 있습니다.'
                     ELSE generation_script
                   END,
                 updated_at =
                   CASE
                     WHEN generation_keywords IS NULL
                       OR btrim(generation_keywords) = ''
                       OR generation_script IS NULL
                       OR btrim(generation_script) = ''
                       THEN NOW()
                     ELSE updated_at
                   END
           WHERE quiz_id = v_quiz_id;
        END IF;

        SELECT node_id
          INTO v_assignment_node_id
          FROM roadmap_nodes
         WHERE roadmap_id = v_eval_roadmap_id
           AND title = '과제: 나만의 프론트엔드 학습 로드맵 작성'
         LIMIT 1;

        IF v_assignment_node_id IS NULL THEN
          INSERT INTO roadmap_nodes (
            roadmap_id, title, content, node_type, sort_order, sub_topics, branch_group
          )
          VALUES (
            v_eval_roadmap_id,
            '과제: 나만의 프론트엔드 학습 로드맵 작성',
            '로드맵 첫 노드를 기준으로 학습 목표와 산출물 체크리스트를 작성하는 과제 노드입니다.',
            'COURSE_ASSIGNMENT',
            0,
            v_course_title,
            2
          )
          RETURNING node_id INTO v_assignment_node_id;
        ELSE
          UPDATE roadmap_nodes
             SET content = '로드맵 첫 노드를 기준으로 학습 목표와 산출물 체크리스트를 작성하는 과제 노드입니다.',
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
            '나만의 프론트엔드 학습 로드맵 작성',
            '프론트엔드 로드맵의 첫 번째 노드를 기준으로 앞으로 2주 동안 어떤 순서로 학습하고 어떤 산출물을 만들지 정리하는 과제입니다.

상황.
당신은 프론트엔드 학습을 막 시작한 주니어 개발자입니다. 무작정 React부터 들어가기 전에 프론트엔드가 제품에서 맡는 역할과 로드맵의 첫 노드가 요구하는 기본기를 정리해야 합니다.

요구사항.
1. 로드맵 첫 노드에서 반드시 이해해야 할 키워드 5개를 선정하고, 각 키워드를 한 문장으로 설명하세요.
2. 프론트엔드 개발자가 디자이너, 백엔드 개발자, QA와 협업할 때 확인해야 할 질문을 각각 2개씩 작성하세요.
3. 2주 학습 계획을 day 단위로 작성하고, 각 day마다 학습 목표와 확인 가능한 산출물을 적으세요.
4. 마지막에 “다음 강의로 넘어가기 전에 확인할 체크리스트”를 7개 이상 작성하세요.
5. README 형식으로 정리하고, 표와 체크박스를 최소 1개 이상 포함하세요.

제출물.
GitHub 저장소 URL 또는 Markdown 파일을 제출하세요. 저장소로 제출하는 경우 README.md에 과제 내용을 정리하고, 필요한 경우 /docs/frontend-roadmap-plan.md를 추가하세요.',
            'MULTIPLE',
            NULL,
            'md,pdf,zip',
            TRUE,
            FALSE,
            FALSE,
            'README 또는 Markdown 파일에 학습 계획과 체크리스트를 작성해 제출하세요. URL 제출과 파일 제출을 모두 허용합니다. 제출 전 맞춤법, 표 렌더링, 체크박스 표시가 깨지지 않는지 확인하세요.',
            100,
            80,
            FALSE,
            TRUE,
            FALSE,
            TRUE,
            TRUE,
            TRUE,
            TRUE,
            FALSE,
            NOW(),
            NOW()
          )
          RETURNING assignment_id INTO v_assignment_id;
        ELSE
          UPDATE assignments
             SET title = '나만의 프론트엔드 학습 로드맵 작성',
                 description = '프론트엔드 로드맵의 첫 번째 노드를 기준으로 앞으로 2주 동안 어떤 순서로 학습하고 어떤 산출물을 만들지 정리하는 과제입니다.

상황.
당신은 프론트엔드 학습을 막 시작한 주니어 개발자입니다. 무작정 React부터 들어가기 전에 프론트엔드가 제품에서 맡는 역할과 로드맵의 첫 노드가 요구하는 기본기를 정리해야 합니다.

요구사항.
1. 로드맵 첫 노드에서 반드시 이해해야 할 키워드 5개를 선정하고, 각 키워드를 한 문장으로 설명하세요.
2. 프론트엔드 개발자가 디자이너, 백엔드 개발자, QA와 협업할 때 확인해야 할 질문을 각각 2개씩 작성하세요.
3. 2주 학습 계획을 day 단위로 작성하고, 각 day마다 학습 목표와 확인 가능한 산출물을 적으세요.
4. 마지막에 “다음 강의로 넘어가기 전에 확인할 체크리스트”를 7개 이상 작성하세요.
5. README 형식으로 정리하고, 표와 체크박스를 최소 1개 이상 포함하세요.

제출물.
GitHub 저장소 URL 또는 Markdown 파일을 제출하세요. 저장소로 제출하는 경우 README.md에 과제 내용을 정리하고, 필요한 경우 /docs/frontend-roadmap-plan.md를 추가하세요.',
                 submission_type = 'MULTIPLE',
                 due_at = NULL,
                 allowed_file_formats = 'md,pdf,zip',
                 readme_required = TRUE,
                 test_required = FALSE,
                 lint_required = FALSE,
                 submission_rule_description = 'README 또는 Markdown 파일에 학습 계획과 체크리스트를 작성해 제출하세요. URL 제출과 파일 제출을 모두 허용합니다. 제출 전 맞춤법, 표 렌더링, 체크박스 표시가 깨지지 않는지 확인하세요.',
                 total_score = 100,
                 pass_score = 80,
                 is_published = FALSE,
                 is_active = TRUE,
                 allow_late_submission = FALSE,
                 ai_review_enabled = TRUE,
                 allow_text_submission = TRUE,
                 allow_file_submission = TRUE,
                 allow_url_submission = TRUE,
                 updated_at = NOW()
           WHERE assignment_id = v_assignment_id;
        END IF;

        INSERT INTO assignment_rubrics (
          assignment_id, criteria_name, criteria_description,
          max_points, display_order, is_deleted, created_at, updated_at
        )
        SELECT v_assignment_id, seed.criteria_name, seed.criteria_description,
               seed.max_points, seed.display_order, FALSE, NOW(), NOW()
          FROM (VALUES
            ('로드맵 키워드 이해', '첫 노드의 핵심 키워드를 정확히 설명하고 서로의 관계를 정리했습니다.', 25, 1),
            ('직무 역할과 협업 질문', '프론트엔드 개발자의 책임과 협업 대상별 확인 질문이 실제 업무 상황에 맞습니다.', 25, 2),
            ('2주 학습 계획의 실행 가능성', 'day 단위 목표와 산출물이 구체적이고 다음 학습으로 이어지도록 구성되었습니다.', 30, 3),
            ('README 구성과 제출 완성도', '표, 체크박스, 제출 링크 또는 파일 구조가 명확하고 읽기 쉽습니다.', 20, 4)
          ) AS seed(criteria_name, criteria_description, max_points, display_order)
         WHERE NOT EXISTS (
           SELECT 1
             FROM assignment_rubrics ar
            WHERE ar.assignment_id = v_assignment_id
              AND ar.display_order = seed.display_order
         );
      END $$;
      """;
}
