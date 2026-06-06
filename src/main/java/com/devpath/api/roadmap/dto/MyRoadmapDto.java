package com.devpath.api.roadmap.dto;

import com.devpath.domain.learning.entity.clearance.NodeClearance;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.DisplayNodeStatus;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNodeResource;
import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class MyRoadmapDto {

  private static final String BUILDER_ROADMAP_INFO_CONTENT =
      """
      <div class="p-6 text-sm text-gray-700 leading-relaxed space-y-6">
        <div>
          <p class="mb-2"><span class="font-bold text-gray-900">나만의 로드맵</span>은 학습자가 직접 선택한 기술과 관심 주제를 바탕으로 구성한 개인 맞춤형 학습 경로입니다.</p>
          <p>특정 직무나 기술 스택 하나에만 묶이지 않고, 프론트엔드, 백엔드, 인프라, 데이터, AI처럼 서로 다른 분야의 모듈이 섞여 있어도 선택한 순서와 선행 관계에 따라 단계적으로 학습할 수 있도록 구성됩니다.</p>
        </div>
        <div>
          <strong class="block text-gray-900 text-base mb-2">🧭 이 로드맵은 어떻게 활용하나요?</strong>
          <p class="mb-4">각 노드는 목표를 작은 학습 단위로 나눈 항목입니다. 먼저 핵심 개념을 정리하고, 관련 강의나 참고 자료로 이해를 보강한 뒤, 과제와 프로젝트에 적용하면서 실전 역량으로 연결해 보세요.</p>
          <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <strong class="block text-[#00C471] mb-2"><i class="fas fa-check-circle mr-1"></i> 학습 포인트</strong>
            <ul class="list-disc pl-5 space-y-1 text-gray-600">
              <li><strong>선택한 주제 중심 학습:</strong> 직접 고른 모듈을 기준으로 필요한 개념을 순서대로 정리합니다</li>
              <li><strong>분야 간 연결:</strong> 여러 분야가 섞여 있어도 하나의 학습 흐름으로 이어지도록 단계별 목표를 확인합니다</li>
              <li><strong>실습 기반 성장:</strong> 학습한 내용을 과제, 미니 프로젝트, 포트폴리오 작업으로 확장합니다</li>
              <li><strong>지속적인 조정:</strong> 학습 중 필요한 노드를 추가하거나 변경하며 현재 목표에 맞는 경로로 다듬어 갑니다</li>
            </ul>
          </div>
        </div>
      </div>
      """;

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(name = "MyRoadmapListResponse")
  public static class ListResponse {

    @Schema(description = "내 커스텀 로드맵 목록")
    private List<Item> roadmaps;

    @Builder
    private ListResponse(List<Item> roadmaps) {
      this.roadmaps = roadmaps;
    }

    public static ListResponse of(List<Item> roadmaps) {
      return ListResponse.builder().roadmaps(roadmaps).build();
    }
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  public static class Item {

    @Schema(example = "10")
    private Long customRoadmapId;

    @Schema(example = "1")
    private Long originalRoadmapId;

    @Schema(example = "Backend Master Roadmap")
    private String title;

    @Schema(description = "생성 시각")
    private LocalDateTime createdAt;

    @Schema(description = "理쒓렐 ?섏젙 ?쒓컖")
    private LocalDateTime updatedAt;

    @Schema(description = "理쒓렐 ?숈뒿 ?쒓컖")
    private LocalDateTime lastStudiedAt;

    @Schema(description = "진행률 (0~100)", example = "45")
    private Integer progressRate;

    @Schema(description = "빌더에서 직접 만든 로드맵 여부")
    @com.fasterxml.jackson.annotation.JsonProperty("isBuilderOrigin")
    private boolean isBuilderOrigin;

    @Schema(description = "빌더 로드맵 ID (isBuilderOrigin=true일 때만 존재, 편집에 사용)")
    private Long builderRoadmapId;

    @Builder
    private Item(
        Long customRoadmapId,
        Long originalRoadmapId,
        String title,
        Integer progressRate,
        boolean isBuilderOrigin,
        Long builderRoadmapId,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        LocalDateTime lastStudiedAt) {
      this.customRoadmapId = customRoadmapId;
      this.originalRoadmapId = originalRoadmapId;
      this.title = title;
      this.progressRate = progressRate;
      this.isBuilderOrigin = isBuilderOrigin;
      this.builderRoadmapId = builderRoadmapId;
      this.createdAt = createdAt;
      this.updatedAt = updatedAt;
      this.lastStudiedAt = lastStudiedAt;
    }

    public static Item from(
        CustomRoadmap entity, LocalDateTime lastStudiedAt, Long builderRoadmapId) {
      return Item.builder()
          .customRoadmapId(entity.getId())
          .originalRoadmapId(
              entity.getOriginalRoadmap() != null
                  ? entity.getOriginalRoadmap().getRoadmapId()
                  : null)
          .title(entity.getTitle())
          .progressRate(entity.getProgressRate() != null ? entity.getProgressRate() : 0)
          .isBuilderOrigin(entity.isBuilderOrigin())
          .builderRoadmapId(builderRoadmapId)
          .createdAt(entity.getCreatedAt())
          .updatedAt(entity.getUpdatedAt())
          .lastStudiedAt(lastStudiedAt)
          .build();
    }
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(name = "MyRoadmapRenameRequest")
  public static class RenameRequest {

    @Schema(description = "변경할 로드맵 이름", example = "나의 백엔드 마스터 로드맵")
    private String title;

    @Builder
    private RenameRequest(String title) {
      this.title = title;
    }
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  @Schema(name = "MyRoadmapDetailResponse")
  public static class DetailResponse {

    @Schema(example = "10")
    private Long customRoadmapId;

    @Schema(example = "1")
    private Long originalRoadmapId;

    @Schema(example = "Backend Master Roadmap")
    private String title;

    @Schema(description = "상세 안내 제목")
    private String infoTitle;

    @Schema(description = "상세 안내 본문 HTML")
    private String infoContent;

    @Schema(example = "0")
    private Integer progressRate;

    @Schema(description = "생성 시각")
    private LocalDateTime createdAt;

    @Schema(description = "빌더에서 직접 만든 로드맵 여부")
    @JsonProperty("isBuilderOrigin")
    private boolean isBuilderOrigin;

    @Schema(description = "내 로드맵 노드 목록")
    private List<NodeItem> nodes;

    @Builder
    private DetailResponse(
        Long customRoadmapId,
        Long originalRoadmapId,
        String title,
        String infoTitle,
        String infoContent,
        Integer progressRate,
        LocalDateTime createdAt,
        boolean isBuilderOrigin,
        List<NodeItem> nodes) {
      this.customRoadmapId = customRoadmapId;
      this.originalRoadmapId = originalRoadmapId;
      this.title = title;
      this.infoTitle = infoTitle;
      this.infoContent = infoContent;
      this.progressRate = progressRate;
      this.createdAt = createdAt;
      this.isBuilderOrigin = isBuilderOrigin;
      this.nodes = nodes;
    }

    public static DetailResponse from(
        CustomRoadmap customRoadmap,
        Integer progressRate,
        List<CustomRoadmapNode> nodes,
        Map<Long, List<Long>> prerequisiteIdsByNodeId,
        Map<Long, NodeStatus> statusByNodeId,
        Map<Long, NodeClearance> clearanceByNodeId,
        Map<Long, List<RoadmapNodeResource>> resourcesByNodeId,
        Map<Long, List<String>> requiredTagsByNodeId,
        Map<Long, Boolean> requiredTagsSatisfiedByNodeId,
        Map<Long, Boolean> readyToClearByCustomNodeId,
        Map<Long, Integer> clearProgressByCustomNodeId) {
      Roadmap orig = customRoadmap.getOriginalRoadmap();
      return DetailResponse.builder()
          .customRoadmapId(customRoadmap.getId())
          .originalRoadmapId(orig != null ? orig.getRoadmapId() : null)
          .title(customRoadmap.getTitle())
          .infoTitle(orig != null ? orig.getInfoTitle() : null)
          .infoContent(resolveInfoContent(customRoadmap, orig))
          .progressRate(progressRate)
          .createdAt(customRoadmap.getCreatedAt())
          .isBuilderOrigin(customRoadmap.isBuilderOrigin())
          .nodes(
              nodes.stream()
                  .map(
                      node ->
                          NodeItem.from(
                              node,
                              prerequisiteIdsByNodeId.getOrDefault(node.getId(), List.of()),
                              statusByNodeId,
                              node.getOriginalNode() != null
                                  ? clearanceByNodeId.get(node.getOriginalNode().getNodeId())
                                  : null,
                              node.getOriginalNode() != null
                                  ? resourcesByNodeId.getOrDefault(
                                      node.getOriginalNode().getNodeId(), List.of())
                                  : List.of(),
                              node.getOriginalNode() != null
                                  ? requiredTagsByNodeId.getOrDefault(
                                      node.getOriginalNode().getNodeId(), List.of())
                                  : List.of(),
                              node.getOriginalNode() != null
                                  ? requiredTagsSatisfiedByNodeId.get(
                                      node.getOriginalNode().getNodeId())
                                  : null,
                              readyToClearByCustomNodeId.getOrDefault(node.getId(), false),
                              clearProgressByCustomNodeId.getOrDefault(node.getId(), 100)))
                  .toList())
          .build();
    }

    private static String resolveInfoContent(CustomRoadmap customRoadmap, Roadmap originalRoadmap) {
      if (originalRoadmap != null) {
        return originalRoadmap.getInfoContent();
      }
      if (!customRoadmap.isBuilderOrigin()) {
        return null;
      }
      return BUILDER_ROADMAP_INFO_CONTENT;
    }
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  public static class NodeItem {

    @Schema(example = "101")
    private Long customNodeId;

    @Schema(example = "11")
    private Long originalNodeId;

    @Schema(example = "Java Basics")
    private String title;

    @Schema(example = "1")
    private Integer sortOrder;

    @Schema(example = "COMPLETED", description = "PENDING / IN_PROGRESS / COMPLETED / LOCKED")
    private DisplayNodeStatus status;

    @Schema(description = "선행 커스텀 노드 ID 목록")
    private List<Long> prerequisiteCustomNodeIds;

    @Schema(description = "노드 설명")
    private String content;

    @Schema(description = "서브토픽 칩 목록")
    private List<String> subTopics;

    @Schema(description = "분기 그룹 (null=척추, 1=왼쪽, 2=오른쪽)")
    private Integer branchGroup;

    @Schema(description = "진단 퀴즈 추천 분기 노드 여부")
    @JsonProperty("isBranch")
    private boolean isBranch;

    @Schema(description = "분기 출발 원본 노드 ID (isBranch=true 일 때만 존재)")
    private Long branchFromNodeId;

    @Schema(description = "분기 종류: REVIEW(복습) | ADVANCED(심화) | null(일반)")
    private String branchType;

    @Schema(description = "레슨 진행률 (0.0~1.0), null이면 미시작")
    private Double lessonCompletionRate;

    @Schema(description = "필수 태그 충족 여부")
    private boolean requiredTagsSatisfied;

    @Schema(description = "필수 태그 이름 목록 (강좌 목록 필터용)")
    private List<String> requiredTags;

    @Schema(description = "실제 클리어 가능 여부 (선행완료 + 태그/재학습 게이트). UI는 이 값을 신뢰")
    private boolean readyToClear;

    @Schema(description = "클리어 진행도(%) — 충족 태그/전체 필수 태그. 필수태그 없으면 100")
    private int clearProgressPercent;

    @Schema(description = "노드 추천 무료 자료 목록")
    private List<NodeResourceItem> resources;

    @Builder
    private NodeItem(
        Long customNodeId,
        Long originalNodeId,
        String title,
        Integer sortOrder,
        DisplayNodeStatus status,
        List<Long> prerequisiteCustomNodeIds,
        String content,
        List<String> subTopics,
        Integer branchGroup,
        boolean isBranch,
        Long branchFromNodeId,
        String branchType,
        Double lessonCompletionRate,
        boolean requiredTagsSatisfied,
        List<String> requiredTags,
        boolean readyToClear,
        int clearProgressPercent,
        List<NodeResourceItem> resources) {
      this.customNodeId = customNodeId;
      this.originalNodeId = originalNodeId;
      this.title = title;
      this.sortOrder = sortOrder;
      this.status = status;
      this.prerequisiteCustomNodeIds = prerequisiteCustomNodeIds;
      this.content = content;
      this.subTopics = subTopics;
      this.branchGroup = branchGroup;
      this.isBranch = isBranch;
      this.branchFromNodeId = branchFromNodeId;
      this.branchType = branchType;
      this.lessonCompletionRate = lessonCompletionRate;
      this.requiredTagsSatisfied = requiredTagsSatisfied;
      this.requiredTags = requiredTags;
      this.readyToClear = readyToClear;
      this.clearProgressPercent = clearProgressPercent;
      this.resources = resources;
    }

    public static NodeItem from(
        CustomRoadmapNode node,
        List<Long> prerequisiteCustomNodeIds,
        Map<Long, NodeStatus> statusByNodeId,
        NodeClearance clearance,
        List<RoadmapNodeResource> resources,
        List<String> requiredTags,
        Boolean requiredTagsSatisfied,
        boolean readyToClear,
        int clearProgressPercent) {

      boolean isBuilderOrigin = node.getOriginalNode() == null;

      String title;
      List<String> chips;
      Integer branchGroup;
      String content;
      Long originalNodeId;

      if (isBuilderOrigin) {
        title = node.getBuilderModule().getTitle();
        chips =
            node.getBuilderModule().getTopics() != null
                ? node.getBuilderModule().getTopics()
                : List.of();
        branchGroup = node.getBuilderBranchGroup();
        content = null;
        originalNodeId = null;
      } else {
        title = node.getOriginalNode().getTitle();
        String raw = node.getOriginalNode().getSubTopics();
        chips =
            (raw != null && !raw.isBlank())
                ? Arrays.stream(raw.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList()
                : List.of();
        branchGroup = node.getOriginalNode().getBranchGroup();
        content = node.getOriginalNode().getContent();
        originalNodeId = node.getOriginalNode().getNodeId();
      }

      DisplayNodeStatus displayStatus;
      if (node.getStatus() == NodeStatus.COMPLETED) {
        displayStatus = DisplayNodeStatus.COMPLETED;
      } else if (node.getStatus() == NodeStatus.IN_PROGRESS) {
        displayStatus = DisplayNodeStatus.IN_PROGRESS;
      } else {
        boolean isLocked =
            !prerequisiteCustomNodeIds.isEmpty()
                && prerequisiteCustomNodeIds.stream()
                    .anyMatch(
                        prereqId ->
                            statusByNodeId.getOrDefault(prereqId, NodeStatus.NOT_STARTED)
                                != NodeStatus.COMPLETED);
        displayStatus = isLocked ? DisplayNodeStatus.LOCKED : DisplayNodeStatus.PENDING;
      }

      double lessonRate =
          clearance != null && clearance.getLessonCompletionRate() != null
              ? clearance.getLessonCompletionRate().doubleValue()
              : 0.0;
      boolean tagsSatisfied =
          isBuilderOrigin
              || requiredTags.isEmpty()
              || (requiredTagsSatisfied != null
                  ? requiredTagsSatisfied
                  : clearance != null && Boolean.TRUE.equals(clearance.getRequiredTagsSatisfied()));

      return NodeItem.builder()
          .customNodeId(node.getId())
          .originalNodeId(originalNodeId)
          .title(title)
          .sortOrder(node.getCustomSortOrder())
          .status(displayStatus)
          .prerequisiteCustomNodeIds(prerequisiteCustomNodeIds)
          .content(content)
          .subTopics(chips)
          .branchGroup(branchGroup)
          .isBranch(node.isBranch())
          .branchFromNodeId(node.getBranchFromNodeId())
          .branchType(node.getBranchType())
          .lessonCompletionRate(lessonRate)
          .requiredTagsSatisfied(tagsSatisfied)
          .requiredTags(requiredTags)
          .readyToClear(readyToClear)
          .clearProgressPercent(clearProgressPercent)
          .resources(resources.stream().map(NodeResourceItem::from).toList())
          .build();
    }
  }

  @Getter
  @NoArgsConstructor(access = AccessLevel.PROTECTED)
  public static class NodeResourceItem {

    @Schema(example = "1")
    private Long resourceId;

    @Schema(example = "Java 공식 튜토리얼")
    private String title;

    @Schema(example = "https://docs.oracle.com/javase/tutorial/")
    private String url;

    @Schema(description = "자료 설명")
    private String description;

    @Schema(description = "BLOG / DOCS / VIDEO / OFFICIAL / COURSE / OTHER")
    private String sourceType;

    @Schema(example = "1")
    private Integer sortOrder;

    @Builder
    private NodeResourceItem(
        Long resourceId,
        String title,
        String url,
        String description,
        String sourceType,
        Integer sortOrder) {
      this.resourceId = resourceId;
      this.title = title;
      this.url = url;
      this.description = description;
      this.sourceType = sourceType;
      this.sortOrder = sortOrder;
    }

    public static NodeResourceItem from(RoadmapNodeResource resource) {
      return NodeResourceItem.builder()
          .resourceId(resource.getResourceId())
          .title(resource.getTitle())
          .url(resource.getUrl())
          .description(resource.getDescription())
          .sourceType(resource.getSourceType())
          .sortOrder(resource.getSortOrder())
          .build();
    }
  }
}
