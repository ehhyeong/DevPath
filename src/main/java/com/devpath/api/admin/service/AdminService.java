package com.devpath.api.admin.service;

import com.devpath.api.user.dto.RoadmapDto;
import com.devpath.api.user.dto.TagDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminService {

  private final TagRepository tagRepository;
  private final RoadmapRepository roadmapRepository;
  private final UserRepository userRepository;
  private final UserTechStackRepository userTechStackRepository;
  private final NodeRequiredTagRepository nodeRequiredTagRepository;

  @Transactional
  public TagDto.Response createTag(TagDto.CreateRequest request) {
    if (tagRepository.findByName(request.getName()).isPresent()) {
      throw new CustomException(ErrorCode.DUPLICATE_RESOURCE);
    }

    Tag tag = Tag.builder().name(request.getName()).category(request.getCategory()).build();

    return toTagResponse(tagRepository.save(tag));
  }

  @Transactional
  public TagDto.Response updateTag(Long tagId, TagDto.CreateRequest request) {
    Tag tag =
        tagRepository
            .findById(tagId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    tagRepository
        .findByName(request.getName())
        .filter(foundTag -> !foundTag.getTagId().equals(tagId))
        .ifPresent(
            foundTag -> {
              throw new CustomException(ErrorCode.DUPLICATE_RESOURCE);
            });

    tag.updateTagInfo(request.getName(), request.getCategory());
    return toTagResponse(tag);
  }

  @Transactional
  public void deleteTag(Long tagId) {
    Tag tag =
        tagRepository
            .findById(tagId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    userTechStackRepository.deleteAllByTagId(tagId);
    nodeRequiredTagRepository.deleteAllByTagId(tagId);
    tagRepository.delete(tag);
  }

  @Transactional
  public RoadmapDto.Response createOfficialRoadmap(RoadmapDto.CreateRequest request, Long adminId) {
    User admin =
        userRepository
            .findById(adminId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    Roadmap roadmap =
        Roadmap.builder()
            .title(request.getTitle())
            .description(request.getDescription())
            .creator(admin)
            .isOfficial(true)
            .isPublic(true)
            .isDeleted(false)
            .build();

    return toRoadmapResponse(roadmapRepository.save(roadmap));
  }

  @Transactional
  public RoadmapDto.Response updateOfficialRoadmap(
      Long roadmapId, RoadmapDto.CreateRequest request) {
    Roadmap roadmap =
        roadmapRepository
            .findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    roadmap.updateInfo(request.getTitle(), request.getDescription());
    return toRoadmapResponse(roadmap);
  }

  @Transactional
  public void deleteOfficialRoadmap(Long roadmapId) {
    Roadmap roadmap =
        roadmapRepository
            .findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    roadmap.deleteRoadmap();
  }

  private TagDto.Response toTagResponse(Tag tag) {
    return TagDto.Response.builder()
        .tagId(tag.getTagId())
        .name(tag.getName())
        .category(tag.getCategory())
        .isOfficial(tag.getIsOfficial())
        .build();
  }

  private RoadmapDto.Response toRoadmapResponse(Roadmap roadmap) {
    return RoadmapDto.Response.builder()
        .roadmapId(roadmap.getRoadmapId())
        .title(roadmap.getTitle())
        .description(roadmap.getDescription())
        .isOfficial(roadmap.getIsOfficial())
        .createdAt(roadmap.getCreatedAt())
        .build();
  }
}
