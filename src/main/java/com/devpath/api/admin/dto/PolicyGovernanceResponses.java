package com.devpath.api.admin.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

public class PolicyGovernanceResponses {

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "강의-노드 매핑 후보 조회 응답 DTO")
  public static class MappingCandidatesResponse {

    @Schema(description = "후보를 계산한 강의 수", example = "3")
    private Integer totalCourses;

    @Schema(description = "강의별 매핑 후보 목록")
    private List<CourseMappingCandidateItem> courses;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "강의별 매핑 후보 항목 DTO")
  public static class CourseMappingCandidateItem {

    @Schema(description = "강의 ID", example = "12")
    private Long courseId;

    @Schema(description = "강의 제목", example = "Spring Security 완전 정복")
    private String courseTitle;

    @Schema(description = "강의 상태", example = "PUBLISHED")
    private String courseStatus;

    @Schema(description = "강의 태그 목록")
    private List<String> courseTags;

    @Schema(description = "이미 확정 저장된 노드 ID 목록")
    private List<Long> mappedNodeIds;

    @Schema(description = "추천 후보 수", example = "2")
    private Integer totalCandidates;

    @Schema(description = "노드 후보 목록")
    private List<NodeCandidateItem> candidates;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "노드 후보 항목 DTO")
  public static class NodeCandidateItem {

    @Schema(description = "로드맵 ID", example = "3")
    private Long roadmapId;

    @Schema(description = "로드맵 제목", example = "백엔드 Spring 로드맵")
    private String roadmapTitle;

    @Schema(description = "노드 ID", example = "21")
    private Long nodeId;

    @Schema(description = "노드 제목", example = "Spring Security")
    private String nodeTitle;

    @Schema(description = "노드 타입", example = "CONCEPT")
    private String nodeType;

    @Schema(description = "정렬 순서", example = "4")
    private Integer sortOrder;

    @Schema(description = "필수 태그 목록")
    private List<String> requiredTags;

    @Schema(description = "일치한 태그 목록")
    private List<String> matchedTags;

    @Schema(description = "부족한 태그 목록")
    private List<String> missingTags;

    @Schema(description = "태그 커버리지 퍼센트", example = "66.7")
    private BigDecimal coveragePercent;

    @Schema(description = "필수 태그를 모두 충족했는지 여부", example = "false")
    private Boolean fullyMatched;
  }

  @Getter
  @Builder
  @AllArgsConstructor
  @Schema(description = "시스템 정책 응답 DTO")
  public static class SystemPolicyResponse {

    @Schema(description = "플랫폼 수수료율", example = "15.0")
    private BigDecimal platformFeeRate;

    @Schema(description = "강사 정산 비율", example = "85.0")
    private BigDecimal instructorSettlementRate;

    @Schema(description = "HLS 암호화 적용 여부", example = "true")
    private Boolean isHlsEncrypted;

    @Schema(description = "최대 동시 접속 기기 수", example = "3")
    private Integer maxConcurrentDevices;
  }
}
