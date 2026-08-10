SELECT doc_type, content
FROM (
    VALUES
        (
            1, 'API_SPEC',
            '# DevPath API 초안

## GET /api/roadmaps/recommended
- 목적: 사용자 관심 태그 기반 추천 로드맵 목록 조회
- 응답: roadmapId, title, summary, completionRate, nextNodeTitle

## GET /api/roadmaps/{roadmapId}/nodes
- 목적: 로드맵 노드와 학습 상태 조회
- 응답: nodeId, title, status, requiredTags, linkedCourseIds

## PATCH /api/learning/nodes/{nodeId}/status
- 목적: 학습자가 노드 상태를 시작, 완료, 보류로 변경
- 요청: status, memo
'
        ),
        (
            2, 'ERD',
            'users
  └─ learning_progress
       ├─ roadmap_id
       └─ roadmap_node_id

roadmaps
  └─ roadmap_nodes
       └─ course_node_mappings

courses
  └─ course_sections
       └─ lessons
'
        ),
        (
            3, 'INFRA',
            '- Frontend: React, Vite, workspace-hub 라우팅
- Backend: Spring Boot, PostgreSQL
- Storage: 로컬 개발 환경에서는 workspace file storage 사용
- 배포 전 확인: API base URL, CORS, JWT 만료 정책
'
        )
) AS seed(sort_order, doc_type, content)
ORDER BY sort_order;
