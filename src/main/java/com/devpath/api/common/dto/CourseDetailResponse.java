package com.devpath.api.common.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

// 강의 상세 조회 공통 응답 DTO를 제공한다.
@Getter
@Builder
@AllArgsConstructor
@Schema(description = "강의 상세 조회 응답 DTO")
public class CourseDetailResponse {

    @Schema(description = "강의 ID", example = "1")
    private Long courseId;

    @Schema(description = "강의 제목", example = "Spring Security 완전 정복")
    private String title;

    @Schema(description = "강의 부제목", example = "JWT, OAuth2, Spring Security 실전 가이드")
    private String subtitle;

    @Schema(description = "강의 설명")
    private String description;

    @Schema(description = "강의 상태", example = "DRAFT")
    private String status;

    @Schema(description = "판매가", example = "99000")
    private BigDecimal price;

    @Schema(description = "정가", example = "129000")
    private BigDecimal originalPrice;

    @Schema(description = "통화 코드", example = "KRW")
    private String currency;

    @Schema(description = "난이도", example = "BEGINNER")
    private String difficultyLevel;

    @Schema(description = "강의 언어", example = "ko")
    private String language;

    @Schema(description = "수료증 제공 여부", example = "true")
    private Boolean hasCertificate;

    @Schema(description = "썸네일 URL")
    private String thumbnailUrl;

    @Schema(description = "인트로/트레일러 영상 URL")
    private String introVideoUrl;

    @Schema(description = "비디오 에셋 키")
    private String videoAssetKey;

    @Schema(description = "비디오 길이(초)", example = "95")
    private Integer durationSeconds;

    @Schema(description = "선수지식 목록")
    private List<String> prerequisites;

    @Schema(description = "직무 연관성 목록")
    private List<String> jobRelevance;

    @Schema(description = "강의 목표 목록")
    private List<ObjectiveItem> objectives;

    @Schema(description = "수강 대상 목록")
    private List<TargetAudienceItem> targetAudiences;

    @Schema(description = "강의 태그 목록")
    private List<TagItem> tags;

    @Schema(description = "강사 정보")
    private InstructorInfo instructor;

    @Schema(description = "섹션 목록")
    private List<SectionItem> sections;

    @Schema(description = "뉴스 목록")
    private List<NewsItem> news;

    // 강의 목표 응답 DTO다.
    @Getter
    @Builder
    @AllArgsConstructor
    @Schema(description = "강의 목표 응답 DTO")
    public static class ObjectiveItem {

        @Schema(description = "강의 목표 ID", example = "10")
        private Long objectiveId;

        @Schema(description = "강의 목표 내용")
        private String objectiveText;

        @Schema(description = "표시 순서", example = "0")
        private Integer displayOrder;
    }

    // 수강 대상 응답 DTO다.
    @Getter
    @Builder
    @AllArgsConstructor
    @Schema(description = "수강 대상 응답 DTO")
    public static class TargetAudienceItem {

        @Schema(description = "수강 대상 ID", example = "20")
        private Long targetAudienceId;

        @Schema(description = "수강 대상 설명")
        private String audienceDescription;

        @Schema(description = "표시 순서", example = "0")
        private Integer displayOrder;
    }

    // 강의 태그 응답 DTO다.
    @Getter
    @Builder
    @AllArgsConstructor
    @Schema(description = "강의 태그 응답 DTO")
    public static class TagItem {

        @Schema(description = "태그 ID", example = "3")
        private Long tagId;

        @Schema(description = "태그명", example = "Spring Boot")
        private String tagName;

        @Schema(description = "숙련도", example = "3")
        private Integer proficiencyLevel;
    }

    // 강사 정보 응답 DTO다.
    @Getter
    @Builder
    @AllArgsConstructor
    @Schema(description = "강사 정보 응답 DTO")
    public static class InstructorInfo {

        @Schema(description = "강사 회원 ID", example = "7")
        private Long instructorId;

        @Schema(description = "채널명", example = "태형의 백엔드 실험실")
        private String channelName;

        @Schema(description = "프로필 이미지 URL")
        private String profileImage;

        @Schema(description = "한줄 소개", example = "Spring Boot와 Security를 실전 중심으로 가르치는 강사입니다.")
        private String headline;

        @Schema(description = "전문 분야 목록")
        private List<String> specialties;

        @Schema(
                description = "강사 채널 상세 조회 API 경로",
                example = "/api/instructors/7/channel"
        )
        private String channelApiPath;
    }

    // 섹션 응답 DTO다.
    @Getter
    @Builder
    @AllArgsConstructor
    @Schema(description = "섹션 응답 DTO")
    public static class SectionItem {

        @Schema(description = "섹션 ID", example = "101")
        private Long sectionId;

        @Schema(description = "섹션 제목")
        private String title;

        @Schema(description = "섹션 설명")
        private String description;

        @Schema(description = "섹션 순서", example = "1")
        private Integer sortOrder;

        @Schema(description = "섹션 공개 여부", example = "true")
        private Boolean isPublished;

        @Schema(description = "레슨 목록")
        private List<LessonItem> lessons;
    }

    // 레슨 응답 DTO다.
    @Getter
    @Builder
    @AllArgsConstructor
    @Schema(description = "레슨 응답 DTO")
    public static class LessonItem {

        @Schema(description = "레슨 ID", example = "1001")
        private Long lessonId;

        @Schema(description = "레슨 제목")
        private String title;

        @Schema(description = "레슨 설명")
        private String description;

        @Schema(description = "레슨 타입", example = "VIDEO")
        private String lessonType;

        @Schema(description = "영상 URL")
        private String videoUrl;

        @Schema(description = "영상 에셋 키")
        private String videoAssetKey;

        @Schema(description = "썸네일 URL")
        private String thumbnailUrl;

        @Schema(description = "영상 길이(초)", example = "780")
        private Integer durationSeconds;

        @Schema(description = "미리보기 여부", example = "false")
        private Boolean isPreview;

        @Schema(description = "공개 여부", example = "true")
        private Boolean isPublished;

        @Schema(description = "레슨 순서", example = "1")
        private Integer sortOrder;

        @Schema(description = "첨부 자료 목록")
        private List<MaterialItem> materials;
    }

    // 첨부 자료 응답 DTO다.
    @Getter
    @Builder
    @AllArgsConstructor
    @Schema(description = "첨부 자료 응답 DTO")
    public static class MaterialItem {

        @Schema(description = "자료 ID", example = "5001")
        private Long materialId;

        @Schema(description = "자료 타입", example = "SLIDE")
        private String materialType;

        @Schema(description = "자료 URL")
        private String materialUrl;

        @Schema(description = "스토리지 에셋 키")
        private String assetKey;

        @Schema(description = "원본 파일명")
        private String originalFileName;

        @Schema(description = "정렬 순서", example = "0")
        private Integer sortOrder;
    }

    // 뉴스 응답 DTO다.
    @Getter
    @Builder
    @AllArgsConstructor
    @Schema(description = "뉴스 응답 DTO")
    public static class NewsItem {

        @Schema(description = "뉴스 제목")
        private String title;

        @Schema(description = "뉴스 URL")
        private String url;
    }
}
