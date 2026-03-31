package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.governance.TagCreateRequest;
import com.devpath.api.admin.dto.governance.TagGuideResponse;
import com.devpath.api.admin.dto.governance.TagMergeRequest;
import com.devpath.api.admin.dto.governance.TagResponse;
import com.devpath.api.admin.dto.governance.TagUpdateRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.CourseTagMap;
import com.devpath.domain.course.repository.CourseTagMapRepository;
import com.devpath.domain.roadmap.entity.NodeRequiredTag;
import com.devpath.domain.roadmap.repository.NodeRequiredTagRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.entity.UserTechStack;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserTechStackRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminTagGovernanceService {

    private final TagRepository tagRepository;
    private final CourseTagMapRepository courseTagMapRepository;
    private final UserTechStackRepository userTechStackRepository;
    private final NodeRequiredTagRepository nodeRequiredTagRepository;

    public TagResponse createTag(TagCreateRequest request) {
        String name = normalizeRequiredValue(request == null ? null : request.getName());
        String category = normalizeOptionalValue(request == null ? null : request.getDescription());

        tagRepository
                .findByName(name)
                .filter(existingTag -> !Boolean.TRUE.equals(existingTag.getIsDeleted()))
                .ifPresent(existingTag -> {
                    throw new CustomException(ErrorCode.ALREADY_EXISTS);
                });

        Tag tag = tagRepository.save(Tag.builder().name(name).category(category).isOfficial(true).build());
        return TagResponse.from(tag);
    }

    public TagResponse updateTag(Long tagId, TagUpdateRequest request) {
        Tag tag = tagRepository
                .findById(tagId)
                .orElseThrow(() -> new CustomException(ErrorCode.TAG_NOT_FOUND));

        String name = normalizeRequiredValue(request == null ? null : request.getName());
        String category = normalizeOptionalValue(request == null ? null : request.getDescription());

        tagRepository
                .findByName(name)
                .filter(existingTag ->
                        !Boolean.TRUE.equals(existingTag.getIsDeleted())
                                && !existingTag.getTagId().equals(tagId)
                )
                .ifPresent(existingTag -> {
                    throw new CustomException(ErrorCode.ALREADY_EXISTS);
                });

        tag.updateTagInfo(name, category);
        return TagResponse.from(tag);
    }

    @Transactional(readOnly = true)
    public List<TagResponse> getTags() {
        return tagRepository.findAll().stream()
                .filter(tag -> !Boolean.TRUE.equals(tag.getIsDeleted()))
                .sorted(Comparator.comparing(Tag::getName))
                .map(TagResponse::from)
                .collect(Collectors.toList());
    }

    public void mergeTags(TagMergeRequest request) {
        if (request == null || request.getSourceTagIds() == null || request.getTargetTagId() == null) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        Tag targetTag = tagRepository
                .findById(request.getTargetTagId())
                .orElseThrow(() -> new CustomException(ErrorCode.TAG_NOT_FOUND));

        for (Long sourceTagId : request.getSourceTagIds()) {
            if (sourceTagId.equals(request.getTargetTagId())) {
                throw new CustomException(ErrorCode.INVALID_INPUT);
            }

            Tag sourceTag = tagRepository
                    .findById(sourceTagId)
                    .orElseThrow(() -> new CustomException(ErrorCode.TAG_NOT_FOUND));

            moveCourseTagMappings(sourceTag, targetTag);
            moveUserTechStacks(sourceTag, targetTag);
            moveNodeRequiredTags(sourceTag, targetTag);

            sourceTag.softDelete();
        }
    }

    @Transactional(readOnly = true)
    public TagGuideResponse getTagGuide() {
        List<TagResponse> standardTags = tagRepository.findAll().stream()
                .filter(tag -> Boolean.TRUE.equals(tag.getIsOfficial()) && !Boolean.TRUE.equals(tag.getIsDeleted()))
                .sorted(Comparator.comparing(Tag::getName))
                .map(TagResponse::from)
                .collect(Collectors.toList());

        String guideMessage = "1. 모든 태그는 소문자 kebab-case를 권장합니다.\n"
                + "2. 중복 의미 태그는 관리자 병합 기능으로 정리합니다.\n"
                + "3. category는 backend, frontend, infra처럼 일관된 분류를 사용합니다.";

        return TagGuideResponse.builder()
                .standardTags(standardTags)
                .guideMessage(guideMessage)
                .build();
    }

    private void moveCourseTagMappings(Tag sourceTag, Tag targetTag) {
        List<CourseTagMap> sourceMappings = courseTagMapRepository.findAllByTagTagId(sourceTag.getTagId());

        for (CourseTagMap sourceMapping : sourceMappings) {
            Long courseId = sourceMapping.getCourse().getCourseId();

            if (!courseTagMapRepository.existsByCourseCourseIdAndTagTagId(courseId, targetTag.getTagId())) {
                courseTagMapRepository.save(
                        CourseTagMap.builder()
                                .course(sourceMapping.getCourse())
                                .tag(targetTag)
                                .proficiencyLevel(sourceMapping.getProficiencyLevel())
                                .build());
            }
        }

        courseTagMapRepository.deleteAll(sourceMappings);
    }

    private void moveUserTechStacks(Tag sourceTag, Tag targetTag) {
        List<UserTechStack> sourceTechStacks = userTechStackRepository.findAllByTagTagId(sourceTag.getTagId());

        for (UserTechStack sourceTechStack : sourceTechStacks) {
            Long userId = sourceTechStack.getUser().getId();

            if (!userTechStackRepository.existsByUser_IdAndTag_TagId(userId, targetTag.getTagId())) {
                userTechStackRepository.save(
                        UserTechStack.builder().user(sourceTechStack.getUser()).tag(targetTag).build());
            }
        }

        userTechStackRepository.deleteAll(sourceTechStacks);
    }

    private void moveNodeRequiredTags(Tag sourceTag, Tag targetTag) {
        List<NodeRequiredTag> sourceRequiredTags =
                nodeRequiredTagRepository.findAllByTagTagId(sourceTag.getTagId());

        for (NodeRequiredTag sourceRequiredTag : sourceRequiredTags) {
            Long nodeId = sourceRequiredTag.getNode().getNodeId();

            if (!nodeRequiredTagRepository.existsByNodeNodeIdAndTagTagId(nodeId, targetTag.getTagId())) {
                nodeRequiredTagRepository.save(
                        NodeRequiredTag.builder().node(sourceRequiredTag.getNode()).tag(targetTag).build());
            }
        }

        nodeRequiredTagRepository.deleteAll(sourceRequiredTags);
    }

    private String normalizeRequiredValue(String value) {
        if (value == null || value.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        return value.trim();
    }

    private String normalizeOptionalValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }

        return value.trim();
    }
}
