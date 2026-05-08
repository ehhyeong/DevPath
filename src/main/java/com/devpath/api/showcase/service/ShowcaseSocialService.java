package com.devpath.api.showcase.service;

import com.devpath.api.showcase.dto.CreateShowcaseCommentRequest;
import com.devpath.api.showcase.dto.ShowcaseCommentResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.showcase.entity.ShowcaseComment;
import com.devpath.domain.showcase.entity.ShowcaseLike;
import com.devpath.domain.showcase.repository.ShowcaseCommentRepository;
import com.devpath.domain.showcase.repository.ShowcaseLikeRepository;
import java.util.List;
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
    return ShowcaseCommentResponse.from(showcaseCommentRepository.save(comment));
  }

  public List<ShowcaseCommentResponse> getComments(Long showcaseId) {
    showcaseService.getShowcaseEntity(showcaseId);
    return showcaseCommentRepository
        .findAllByShowcaseIdAndIsDeletedFalseOrderByCreatedAtAsc(showcaseId)
        .stream()
        .map(ShowcaseCommentResponse::from)
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
}
