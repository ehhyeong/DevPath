package com.devpath.api.job.service;

import com.devpath.api.job.dto.JobSkillSuggestionDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.service.CustomRoadmapCopyService;
import com.devpath.domain.roadmap.service.CustomRoadmapPrerequisiteSyncService;
import com.devpath.domain.roadmap.service.NodeRequiredTagRegistrar;
import com.devpath.domain.roadmap.service.RoadmapProgressService;
import com.devpath.domain.roadmap.service.SystemDynamicRoadmapProvider;
import com.devpath.domain.user.entity.User;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class JobSkillRoadmapWriter {

  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;
  private final CustomRoadmapCopyService customRoadmapCopyService;
  private final RoadmapProgressService roadmapProgressService;
  private final CustomRoadmapPrerequisiteSyncService prerequisiteSyncService;
  private final NodeRequiredTagRegistrar nodeRequiredTagRegistrar;
  private final SystemDynamicRoadmapProvider systemDynamicRoadmapProvider;

  JobSkillSuggestionDto.Response create(
      User user, String skill, Long officialRoadmapId, List<NodeDraft> drafts) {
    if (officialRoadmapId != null) {
      Long customRoadmapId =
          customRoadmapCopyService.copyToCustomRoadmap(user.getId(), officialRoadmapId);
      CustomRoadmap created =
          customRoadmapRepository
              .findById(customRoadmapId)
              .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_ROADMAP_NOT_FOUND));
      return response(created);
    }

    CustomRoadmap created =
        customRoadmapRepository.save(
            CustomRoadmap.builderOriginBuilder().user(user).title(skill + " 학습 로드맵").build());
    Roadmap systemRoadmap = systemDynamicRoadmapProvider.resolve();
    int order = 0;
    for (NodeDraft draft : drafts) {
      RoadmapNode dynamicNode =
          roadmapNodeRepository.save(
              RoadmapNode.builder()
                  .roadmap(systemRoadmap)
                  .title(draft.title())
                  .content(draft.content())
                  .subTopics(String.join(",", draft.tags()))
                  .nodeType("NODE")
                  .sortOrder(null)
                  .build());
      nodeRequiredTagRegistrar.registerFromSubTopics(dynamicNode);
      customRoadmapNodeRepository.save(
          CustomRoadmapNode.builder()
              .customRoadmap(created)
              .originalNode(dynamicNode)
              .customSortOrder(order++)
              .build());
    }
    // 생성한 노드들에 레인을 도출하고 선행관계를 만든다(전부 척추 한 줄).
    prerequisiteSyncService.relayoutAndRebuild(created);
    roadmapProgressService.updateProgressRate(
        created, customRoadmapNodeRepository.findAllByCustomRoadmap(created));
    return response(created);
  }

  private JobSkillSuggestionDto.Response response(CustomRoadmap roadmap) {
    return JobSkillSuggestionDto.Response.builder()
        .mode("CREATED")
        .targetCustomRoadmapId(roadmap.getId())
        .roadmapTitle(roadmap.getTitle())
        .redirectUrl("/roadmap?id=" + roadmap.getId())
        .build();
  }

  record NodeDraft(String title, String content, List<String> tags) {}
}
