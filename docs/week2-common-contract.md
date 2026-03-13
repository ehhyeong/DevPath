# Week 2 Common Contract

This file fixes the common DTOs and baseline data assumptions for Week 2.

## Owners

- `CourseListItemResponse`: owner A
- `CourseDetailResponse`: owner A
- `RoadmapEntryResponse`: owner C
- Node and tag value review: owner B

## Shared Rules

- All APIs keep using `ApiResponse<T>` as the common wrapper.
- Money uses `Integer` and stores KRW whole numbers.
- Tags use `List<String>`.
- Nullable fields are explicitly marked below.
- Nested object shape is fixed and should not be flattened differently by each team.

## CourseListItemResponse

Fields:
- `courseId: Long` not null
- `title: String` not null
- `thumbnailUrl: String` nullable
- `instructorName: String` not null
- `instructorChannelName: String` nullable
- `price: Integer` not null
- `discountPrice: Integer` nullable
- `difficulty: CourseDifficulty` not null
- `tags: List<String>` not null
- `isBookmarked: Boolean` not null
- `isEnrolled: Boolean` not null
- `status: CourseStatus` not null

Sample JSON:

```json
{
  "courseId": 1,
  "title": "Spring Boot 입문",
  "thumbnailUrl": "/images/courses/spring-boot.png",
  "instructorName": "홍길동",
  "instructorChannelName": "홍길동 백엔드 연구소",
  "price": 99000,
  "discountPrice": 69000,
  "difficulty": "BEGINNER",
  "tags": ["Spring Boot", "Java"],
  "isBookmarked": false,
  "isEnrolled": false,
  "status": "PUBLISHED"
}
```

## CourseDetailResponse

Fields:
- `courseId: Long` not null
- `title: String` not null
- `subtitle: String` nullable
- `description: String` not null
- `thumbnailUrl: String` nullable
- `trailerUrl: String` nullable
- `instructor: InstructorSummary` not null
- `price: Integer` not null
- `discountPrice: Integer` nullable
- `status: CourseStatus` not null
- `objectives: List<String>` not null
- `targetAudiences: List<String>` not null
- `prerequisites: List<String>` not null
- `jobRelevance: List<String>` not null
- `tags: List<String>` not null
- `sections: List<SectionSummary>` not null
- `news: List<NewsSummary>` not null

Nested:
- `InstructorSummary.instructorId: Long` not null
- `InstructorSummary.name: String` not null
- `InstructorSummary.channelName: String` nullable
- `InstructorSummary.profileImageUrl: String` nullable
- `InstructorSummary.specialties: List<String>` not null
- `SectionSummary.sectionId: Long` not null
- `SectionSummary.title: String` not null
- `SectionSummary.order: Integer` not null
- `SectionSummary.lessonCount: Integer` not null
- `SectionSummary.lessons: List<LessonSummary>` not null
- `LessonSummary.lessonId: Long` not null
- `LessonSummary.title: String` not null
- `LessonSummary.order: Integer` not null
- `LessonSummary.previewable: Boolean` not null
- `LessonSummary.durationSeconds: Integer` nullable
- `NewsSummary.newsId: Long` not null
- `NewsSummary.title: String` not null
- `NewsSummary.type: String` not null
- `NewsSummary.pinned: Boolean` not null
- `NewsSummary.createdAt: LocalDateTime` not null

Sample JSON:

```json
{
  "courseId": 1,
  "title": "Spring Boot 입문",
  "subtitle": "실무형 API 서버를 만드는 가장 빠른 경로",
  "description": "Spring Boot, JPA, Security를 함께 다루는 백엔드 입문 강의입니다.",
  "thumbnailUrl": "/images/courses/spring-boot.png",
  "trailerUrl": "/videos/trailers/spring-boot.mp4",
  "instructor": {
    "instructorId": 2,
    "name": "홍길동",
    "channelName": "홍길동 백엔드 연구소",
    "profileImageUrl": "/images/instructors/hong.png",
    "specialties": ["Java", "Spring Boot", "JPA"]
  },
  "price": 99000,
  "discountPrice": 69000,
  "status": "PUBLISHED",
  "objectives": [
    "Spring Boot 애플리케이션을 직접 구성할 수 있다.",
    "JPA 기반 CRUD API를 구현할 수 있다."
  ],
  "targetAudiences": [
    "백엔드 취업 준비생",
    "Spring 프로젝트를 처음 맡는 주니어 개발자"
  ],
  "prerequisites": ["Java 기초 문법", "HTTP 기본 이해"],
  "jobRelevance": ["백엔드 개발자", "서버 엔지니어"],
  "tags": ["Spring Boot", "Java", "JPA"],
  "sections": [
    {
      "sectionId": 11,
      "title": "Spring Core",
      "order": 1,
      "lessonCount": 2,
      "lessons": [
        {
          "lessonId": 101,
          "title": "DI와 IoC 이해하기",
          "order": 1,
          "previewable": true,
          "durationSeconds": 780
        },
        {
          "lessonId": 102,
          "title": "Bean 등록과 생명주기",
          "order": 2,
          "previewable": false,
          "durationSeconds": 920
        }
      ]
    }
  ],
  "news": [
    {
      "newsId": 9001,
      "title": "실습 자료 업데이트",
      "type": "UPDATE",
      "pinned": true,
      "createdAt": "2026-03-12T10:00:00"
    }
  ]
}
```

## RoadmapEntryResponse

Fields:
- `roadmapId: Long` not null
- `roadmapTitle: String` not null
- `diagnosisCompleted: Boolean` not null
- `ownedSkills: List<String>` not null
- `skippedNodeIds: List<Long>` not null
- `lockedNodeIds: List<Long>` not null
- `unlockedNodeIds: List<Long>` not null
- `recommendedNodes: List<RecommendedNode>` not null
- `supplementNodes: List<RecommendedNode>` not null
- `nextAction: String` nullable
- `recommendationId: Long` nullable

Nested:
- `RecommendedNode.nodeId: Long` not null
- `RecommendedNode.nodeTitle: String` not null
- `RecommendedNode.reason: String` not null
- `RecommendedNode.priority: String` not null

Sample JSON:

```json
{
  "roadmapId": 1,
  "roadmapTitle": "Backend Master Roadmap",
  "diagnosisCompleted": true,
  "ownedSkills": ["Java", "Spring Boot"],
  "skippedNodeIds": [1],
  "lockedNodeIds": [5, 6],
  "unlockedNodeIds": [2, 3, 4],
  "recommendedNodes": [
    {
      "nodeId": 4,
      "nodeTitle": "Spring Data JPA",
      "reason": "백엔드 서비스 구현에 필요한 persistence 학습이 다음 단계입니다.",
      "priority": "HIGH"
    }
  ],
  "supplementNodes": [
    {
      "nodeId": 2,
      "nodeTitle": "HTTP Fundamentals",
      "reason": "API 설계 이해를 보강하면 이후 학습 효율이 올라갑니다.",
      "priority": "MEDIUM"
    }
  ],
  "nextAction": "recommended_nodes_review",
  "recommendationId": 3001
}
```
