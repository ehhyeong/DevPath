package com.devpath.api.showcase.service;

import com.devpath.api.showcase.dto.CreateShowcaseCommentRequest;
import com.devpath.api.showcase.dto.ShowcaseCommentResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.showcase.entity.ShowcaseComment;
import com.devpath.domain.showcase.entity.ShowcaseLike;
import com.devpath.domain.showcase.repository.ShowcaseCommentRepository;
import com.devpath.domain.showcase.repository.ShowcaseLikeRepository;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShowcaseSocialService {

  private final ShowcaseLikeRepository showcaseLikeRepository;
  private final ShowcaseCommentRepository showcaseCommentRepository;
  private final ShowcaseService showcaseService;
  private final UserProfileRepository userProfileRepository;

  @Transactional
  public void addLike(Long showcaseId, Long userId) {
    showcaseService.getShowcaseEntity(showcaseId);
    if (showcaseLikeRepository.existsByShowcaseIdAndUserId(showcaseId, userId)) {
      throw new CustomException(ErrorCode.SHOWCASE_ALREADY_LIKED);
    }
    showcaseLikeRepository.save(
        ShowcaseLike.builder().showcaseId(showcaseId).userId(userId).build());
  }

  @Transactional
  public void removeLike(Long showcaseId, Long userId) {
    showcaseService.getShowcaseEntity(showcaseId);
    if (!showcaseLikeRepository.existsByShowcaseIdAndUserId(showcaseId, userId)) {
      throw new CustomException(ErrorCode.SHOWCASE_NOT_LIKED);
    }
    showcaseLikeRepository.deleteByShowcaseIdAndUserId(showcaseId, userId);
  }

  public long getLikeCount(Long showcaseId) {
    showcaseService.getShowcaseEntity(showcaseId);
    return showcaseLikeRepository.countByShowcaseId(showcaseId);
  }

  @Transactional
  public ShowcaseCommentResponse addComment(
      Long showcaseId, Long userId, CreateShowcaseCommentRequest request) {
    showcaseService.getShowcaseEntity(showcaseId);
    ShowcaseComment comment =
        ShowcaseComment.builder()
            .showcaseId(showcaseId)
            .userId(userId)
            .content(request.getContent())
            .build();
    return ShowcaseCommentResponse.from(
        showcaseCommentRepository.save(comment), profileImage(userId));
  }

  public List<ShowcaseCommentResponse> getComments(Long showcaseId) {
    showcaseService.getShowcaseEntity(showcaseId);
    List<ShowcaseComment> comments =
        showcaseCommentRepository
        .findAllByShowcaseIdAndIsDeletedFalseOrderByCreatedAtAsc(showcaseId)
        .stream()
        .toList();
    Map<Long, String> profileImages = profileImages(comments);
    return comments.stream()
        .map(comment -> ShowcaseCommentResponse.from(comment, profileImages.get(comment.getUserId())))
        .toList();
  }

  @Transactional
  public void deleteComment(Long commentId, Long userId) {
    ShowcaseComment comment =
        showcaseCommentRepository
            .findByIdAndIsDeletedFalse(commentId)
            .orElseThrow(() -> new CustomException(ErrorCode.SHOWCASE_COMMENT_NOT_FOUND));
    if (!comment.getUserId().equals(userId)) {
      throw new CustomException(ErrorCode.SHOWCASE_COMMENT_FORBIDDEN);
    }
    comment.delete();
  }

  private String profileImage(Long userId) {
    return userProfileRepository
        .findByUserId(userId)
        .map(UserProfile::getDisplayProfileImage)
        .orElse(null);
  }

  private Map<Long, String> profileImages(List<ShowcaseComment> comments) {
    List<Long> userIds = comments.stream().map(ShowcaseComment::getUserId).distinct().toList();
    if (userIds.isEmpty()) {
      return Map.of();
    }
    return userProfileRepository.findAllByUserIdIn(userIds).stream()
        .collect(
            Collectors.toMap(
                profile -> profile.getUser().getId(),
                UserProfile::getDisplayProfileImage,
                (left, right) -> left));
  }
}
