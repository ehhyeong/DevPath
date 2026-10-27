-- 이전 편집기가 HTML 시연 과제의 허용 형식을 고정 기본값으로 덮어쓴 경우만 복구한다.
UPDATE assignments
SET allowed_file_formats = 'html', updated_at = CURRENT_TIMESTAMP
WHERE allowed_file_formats = 'pdf,zip,png,jpg,jpeg'
  AND node_id IN (
    SELECT l.assignment_node_id
    FROM lessons l
    JOIN course_sections s ON s.section_id = l.section_id
    JOIN courses c ON c.course_id = s.course_id
    JOIN users u ON u.user_id = c.instructor_id
    WHERE u.email = 'frontend@devpath.com'
      AND c.title = 'HTML CSS JavaScript 렌더링 입문'
      AND l.title = '과제: 렌더링 흐름 미니 페이지 만들기'
  );
