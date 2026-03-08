package com.devpath.api.roadmap.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.NodeStatus;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.service.TagValidationService;
import com.devpath.domain.user.repository.UserTechStackRepository;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 노드 스킵 서비스 - 유저가 보유한 태그와 노드의 필수 태그를 비교하여 스킵 가능 여부 판단 - 조건 충족 시 노드 상태를 COMPLETED로 변경 */
@Service
@RequiredArgsConstructor
public class NodeSkipService {

  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;
  private final UserTechStackRepository userTechStackRepository;
  private final TagValidationService tagValidationService;

  /**
   * 노드 스킵 처리
   *
   * @param userId 유저 ID
   * @param customNodeId 커스텀 노드 ID
   * @return 부족한 태그 목록 (성공 시 빈 Set)
   * @throws CustomException 조건 미달 시 예외 발생
   */
  @Transactional
  public Set<String> skipNode(Long userId, Long customNodeId) {
    // 1. 커스텀 노드 조회
    CustomRoadmapNode customNode =
        customRoadmapNodeRepository
            .findById(customNodeId)
            .orElseThrow(() -> new CustomException(ErrorCode.CUSTOM_NODE_NOT_FOUND));

    // 2. 이미 클리어한 노드인지 확인
    if (customNode.getStatus() == NodeStatus.COMPLETED) {
      throw new CustomException(ErrorCode.NODE_ALREADY_COMPLETED);
    }

    // 3. 원본 노드의 필수 태그 조회
    Long originalNodeId = customNode.getOriginalNode().getNodeId();
    List<String> requiredTags = nodeRequiredTagRepository.findTagNamesByNodeId(originalNodeId);

    // 4. 유저가 보유한 태그 조회
    List<String> userTags = userTechStackRepository.findTagNamesByUserId(userId);

    // 5. 태그 검증
    boolean isValid = tagValidationService.validateTags(requiredTags, userTags);

    if (!isValid) {
      // 부족한 태그 조회 및 예외 발생
      Set<String> missingTags = tagValidationService.getMissingTags(requiredTags, userTags);
      throw new CustomException(
          ErrorCode.INSUFFICIENT_TAGS, "부족한 태그: " + String.join(", ", missingTags));
    }

    // 6. 노드 상태를 COMPLETED로 변경
    customNode.complete();

    return Set.of(); // 성공 시 빈 Set 반환
  }
}
