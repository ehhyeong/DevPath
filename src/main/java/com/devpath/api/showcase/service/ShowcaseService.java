package com.devpath.api.showcase.service;

import com.devpath.api.showcase.dto.CreateShowcaseRequest;
import com.devpath.api.showcase.dto.ShowcaseLinkResponse;
import com.devpath.api.showcase.dto.ShowcaseResponse;
import com.devpath.api.showcase.dto.ShowcaseSummaryResponse;
import com.devpath.api.showcase.dto.UpdateShowcaseLinksRequest;
import com.devpath.api.showcase.dto.UpdateShowcaseRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.showcase.entity.Showcase;
import com.devpath.domain.showcase.entity.ShowcaseCategory;
import com.devpath.domain.showcase.entity.ShowcaseLink;
import com.devpath.domain.showcase.entity.ShowcaseLinkType;
import com.devpath.domain.showcase.entity.ShowcaseSort;
import com.devpath.domain.showcase.repository.ShowcaseLikeRepository;
import com.devpath.domain.showcase.repository.ShowcaseLinkRepository;
import com.devpath.domain.showcase.repository.ShowcaseRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.repository.UserProfileRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ShowcaseService {

  private final ShowcaseRepository showcaseRepository;
  private final ShowcaseLikeRepository showcaseLikeRepository;
  private final ShowcaseLinkRepository showcaseLinkRepository;
  private final UserProfileRepository userProfileRepository;
  private final UserRepository userRepository;

  @Transactional
  public ShowcaseResponse createShowcase(Long userId, CreateShowcaseRequest request) {
    Showcase showcase =
        Showcase.builder()
            .userId(userId)
            .title(request.getTitle())
            .description(request.getDescription())
            .thumbnailUrl(request.getThumbnailUrl())
            .techStack(request.getTechStack())
            .category(request.getCategory())
            .isPublic(request.isPublic())
            .build();
    showcaseRepository.save(showcase);
    return toResponse(showcase);
  }

  public List<ShowcaseSummaryResponse> getShowcases(ShowcaseCategory category, ShowcaseSort sort) {
    List<Showcase> showcases;
    if (sort == ShowcaseSort.POPULAR) {
      showcases =
          (category != null)
              ? showcaseRepository.findAllByCategoryAndIsDeletedFalseOrderByViewCountDesc(category)
              : showcaseRepository.findAllByIsDeletedFalseOrderByViewCountDesc();
    } else {
      showcases =
          (category != null)
              ? showcaseRepository.findAllByCategoryAndIsDeletedFalseOrderByCreatedAtDesc(category)
              : showcaseRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc();
    }
    Map<Long, String> profileImages = profileImages(showcases);
    Map<Long, String> authorNames = new HashMap<>();
    userRepository
        .findAllById(showcases.stream().map(Showcase::getUserId).distinct().toList())
        .forEach(user -> authorNames.put(user.getId(), user.getName()));
    return showcases.stream()
        .map(
            s ->
                ShowcaseSummaryResponse.of(
                    s,
                    showcaseLikeRepository.countByShowcaseId(s.getId()),
                    profileImages.get(s.getUserId()),
                    authorNames.get(s.getUserId())))
        .toList();
  }

  public ShowcaseResponse getShowcase(Long showcaseId) {
    Showcase showcase = getShowcaseEntity(showcaseId);
    return toResponse(showcase);
  }

  @Transactional
  public ShowcaseResponse updateShowcase(
      Long showcaseId, Long userId, UpdateShowcaseRequest request) {
    Showcase showcase = getShowcaseEntity(showcaseId);
    validateOwner(showcase, userId);
    showcase.update(
        request.getTitle(),
        request.getDescription(),
        request.getThumbnailUrl(),
        request.getCategory(),
        request.isPublic());
    if (request.getTechStack() != null) {
      showcase.updateTechStack(request.getTechStack());
    }
    return toResponse(showcase);
  }

  @Transactional
  public void deleteShowcase(Long showcaseId, Long userId) {
    Showcase showcase = getShowcaseEntity(showcaseId);
    validateOwner(showcase, userId);
    showcase.delete();
  }

  @Transactional
  public ShowcaseResponse incrementView(Long showcaseId) {
    Showcase showcase = getShowcaseEntity(showcaseId);
    showcase.incrementView();
    return toResponse(showcase);
  }

  public long getViewCount(Long showcaseId) {
    return getShowcaseEntity(showcaseId).getViewCount();
  }

  @Transactional
  public List<ShowcaseLinkResponse> updateLinks(
      Long showcaseId, Long userId, UpdateShowcaseLinksRequest request) {
    Showcase showcase = getShowcaseEntity(showcaseId);
    validateOwner(showcase, userId);

    showcaseLinkRepository.deleteAllByShowcaseId(showcaseId);

    if (request.getLinks() == null || request.getLinks().isEmpty()) {
      return List.of();
    }

    List<ShowcaseLink> links =
        request.getLinks().stream()
            .map(
                item ->
                    ShowcaseLink.builder()
                        .showcaseId(showcaseId)
                        .linkType(ShowcaseLinkType.valueOf(item.getLinkType()))
                        .url(item.getUrl())
                        .build())
            .toList();
    showcaseLinkRepository.saveAll(links);

    return links.stream().map(ShowcaseLinkResponse::from).toList();
  }

  // --- 내부 헬퍼 ---

  public Showcase getShowcaseEntity(Long showcaseId) {
    return showcaseRepository
        .findByIdAndIsDeletedFalse(showcaseId)
        .orElseThrow(() -> new CustomException(ErrorCode.SHOWCASE_NOT_FOUND));
  }

  private void validateOwner(Showcase showcase, Long userId) {
    if (!showcase.getUserId().equals(userId)) {
      throw new CustomException(ErrorCode.SHOWCASE_FORBIDDEN);
    }
  }

  private ShowcaseResponse toResponse(Showcase showcase) {
    long likeCount = showcaseLikeRepository.countByShowcaseId(showcase.getId());
    List<ShowcaseLinkResponse> links =
        showcaseLinkRepository.findAllByShowcaseId(showcase.getId()).stream()
            .map(ShowcaseLinkResponse::from)
            .toList();
    String authorName =
        userRepository.findById(showcase.getUserId()).map(User::getName).orElse(null);
    return ShowcaseResponse.of(
        showcase, likeCount, links, profileImage(showcase.getUserId()), authorName);
  }

  private String profileImage(Long userId) {
    return userProfileRepository
        .findByUserId(userId)
        .map(UserProfile::getDisplayProfileImage)
        .orElse(null);
  }

  private Map<Long, String> profileImages(List<Showcase> showcases) {
    List<Long> userIds = showcases.stream().map(Showcase::getUserId).distinct().toList();
    if (userIds.isEmpty()) {
      return Map.of();
    }
    Map<Long, String> profileImages = new HashMap<>();
    for (UserProfile profile : userProfileRepository.findAllByUserIdIn(userIds)) {
      profileImages.putIfAbsent(profile.getUser().getId(), profile.getDisplayProfileImage());
    }
    return profileImages;
  }
}
