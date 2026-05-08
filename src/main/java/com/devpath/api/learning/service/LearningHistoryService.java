package com.devpath.api.learning.service;

import com.devpath.api.learning.component.LearningHistoryAssembler;
import com.devpath.api.learning.dto.LearningHistoryRequest;
import com.devpath.api.learning.dto.LearningHistoryResponse;
import com.devpath.api.learning.dto.TilResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.learning.entity.history.LearningHistoryShareLink;
import com.devpath.domain.learning.repository.history.LearningHistoryShareLinkRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LearningHistoryService {

  private final LearningHistoryShareLinkRepository learningHistoryShareLinkRepository;
  private final LearningHistoryAssembler learningHistoryAssembler;
  private final UserRepository userRepository;

  @Transactional(readOnly = true)
  public LearningHistoryResponse.Detail getLearningHistory(Long userId) {
    validateUser(userId);
    return learningHistoryAssembler.assemble(userId);
  }

  @Transactional(readOnly = true)
  public LearningHistoryResponse.Summary getSummary(Long userId) {
    validateUser(userId);
    return learningHistoryAssembler.assembleSummary(userId);
  }

  @Transactional(readOnly = true)
  public List<LearningHistoryResponse.CompletedNodeDetail> getCompletedNodes(Long userId) {
    validateUser(userId);
    return learningHistoryAssembler.assembleCompletedNodes(userId);
  }

  @Transactional(readOnly = true)
  public List<LearningHistoryResponse.AssignmentDetail> getAssignments(Long userId) {
    validateUser(userId);
    return learningHistoryAssembler.assembleAssignments(userId);
  }

  @Transactional(readOnly = true)
  public List<TilResponse> getTilHistory(Long userId) {
    validateUser(userId);
    return learningHistoryAssembler.assembleTils(userId);
  }

  @Transactional
  public LearningHistoryResponse.ShareLinkDetail createShareLink(
      Long userId, LearningHistoryRequest.CreateShareLink request) {
    User user = validateUser(userId);

    LearningHistoryShareLink savedShareLink =
        learningHistoryShareLinkRepository.save(
            LearningHistoryShareLink.builder()
                .user(user)
                .shareToken(generateShareToken())
                .title(request.getTitle())
                .expiresAt(request.getExpiresAt())
                .build());

    return toShareLinkDetail(savedShareLink);
  }

  @Transactional
  public LearningHistoryResponse.SharedDetail getSharedLearningHistory(String shareToken) {
    LearningHistoryShareLink shareLink =
        learningHistoryShareLinkRepository
            .findByShareTokenAndIsActiveTrue(shareToken)
            .orElseThrow(() -> new CustomException(ErrorCode.SHARE_LINK_NOT_FOUND));

    if (shareLink.isExpired()) {
      shareLink.deactivate();
      throw new CustomException(ErrorCode.SHARE_LINK_NOT_FOUND);
    }

    shareLink.increaseAccessCount();

    return LearningHistoryResponse.SharedDetail.builder()
        .shareToken(shareLink.getShareToken())
        .title(shareLink.getTitle())
        .accessCount(shareLink.getAccessCount())
        .history(learningHistoryAssembler.assemble(shareLink.getUser().getId()))
        .build();
  }

  @Transactional(readOnly = true)
  public LearningHistoryResponse.OrganizeResult organize(
      Long userId, LearningHistoryRequest.Organize request) {
    validateUser(userId);

    return LearningHistoryResponse.OrganizeResult.builder()
        .organizedAt(LocalDateTime.now())
        .summary(learningHistoryAssembler.assembleSummary(userId))
        .build();
  }

  private LearningHistoryResponse.ShareLinkDetail toShareLinkDetail(
      LearningHistoryShareLink shareLink) {
    return LearningHistoryResponse.ShareLinkDetail.builder()
        .shareLinkId(shareLink.getId())
        .shareToken(shareLink.getShareToken())
        .title(shareLink.getTitle())
        .shareUrl("/api/me/learning-histories/share-links/" + shareLink.getShareToken())
        .accessCount(shareLink.getAccessCount())
        .expiresAt(shareLink.getExpiresAt())
        .createdAt(shareLink.getCreatedAt())
        .build();
  }

  private String generateShareToken() {
    String shareToken = UUID.randomUUID().toString().replace("-", "");

    while (learningHistoryShareLinkRepository.existsByShareToken(shareToken)) {
      shareToken = UUID.randomUUID().toString().replace("-", "");
    }

    return shareToken;
  }

  private User validateUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }
}
