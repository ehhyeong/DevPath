package com.devpath.api.admin.service;

import com.devpath.api.user.dto.RoadmapDto;
import com.devpath.api.user.dto.TagDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.Tag;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.TagRepository;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final TagRepository tagRepository;
    private final RoadmapRepository roadmapRepository;
    private final UserRepository userRepository;

    // --- 태그 관리 로직 ---
    @Transactional
    public TagDto.Response createTag(TagDto.CreateRequest request) {
        if (tagRepository.findByName(request.getName()).isPresent()) {
            throw new CustomException(ErrorCode.DUPLICATE_RESOURCE); // 커스텀 예외 활용
        }

        Tag tag = Tag.builder()
                .name(request.getName())
                // 카테고리 등 필요한 필드 매핑
                .build();

        Tag savedTag = tagRepository.save(tag);

        return TagDto.Response.builder()
                .tagId(savedTag.getTagId())
                .name(savedTag.getName())
                .build();
    }

    @Transactional
    public TagDto.Response updateTag(Long tagId, TagDto.CreateRequest request) {
        Tag tag = tagRepository.findById(tagId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

        // Setter 대신 비즈니스 메서드 사용 원칙 준수
        tag.updateTagInfo(request.getName(), request.getCategory());

        return TagDto.Response.builder()
                .tagId(tag.getTagId())
                .name(tag.getName())
                .build();
    }

    // --- 로드맵 관리 로직 ---
    @Transactional
    public RoadmapDto.Response createOfficialRoadmap(RoadmapDto.CreateRequest request, Long adminId) {
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Roadmap roadmap = Roadmap.builder()
                .title(request.getTitle())
                .description(request.getDescription())
                .creator(admin)
                .isOfficial(true)
                .isDeleted(false)
                .build();

        Roadmap savedRoadmap = roadmapRepository.save(roadmap);

        return RoadmapDto.Response.builder()
                .roadmapId(savedRoadmap.getRoadmapId())
                .title(savedRoadmap.getTitle())
                .description(savedRoadmap.getDescription())
                .isOfficial(savedRoadmap.getIsOfficial())
                .build();
    }

    @Transactional
    public void deleteOfficialRoadmap(Long roadmapId) {
        Roadmap roadmap = roadmapRepository.findByRoadmapIdAndIsDeletedFalse(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

        // Soft Delete 원칙 준수
        roadmap.deleteRoadmap();
    }
}
