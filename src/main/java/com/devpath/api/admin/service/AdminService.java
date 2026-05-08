package com.devpath.api.admin.service;

import com.devpath.api.user.dto.RoadmapDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

  private final RoadmapRepository roadmapRepository;
  private final UserRepository userRepository;

  public List<RoadmapDto.Response> getOfficialRoadmaps() {
    return roadmapRepository.findAllByIsOfficialTrueAndIsDeletedFalseOrderByTitleAsc().stream()
        .map(this::toRoadmapResponse)
        .toList();
  }

  // 오피셜 로드맵 생성은 관리자 사용자 검증 후 처리한다.
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

  // 오피셜 로드맵만 수정 가능하도록 제한한다.
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

  // 로드맵 상세 화면의 소개 아코디언 콘텐츠만 별도로 수정한다.
  @Transactional
  public RoadmapDto.Response updateOfficialRoadmapInfo(
      Long roadmapId, RoadmapDto.InfoUpdateRequest request) {
    Roadmap roadmap =
        roadmapRepository
            .findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    roadmap.updateIntro(blankToNull(request.getInfoTitle()), blankToNull(request.getInfoContent()));
    return toRoadmapResponse(roadmap);
  }

  // 소개 삭제는 로드맵 자체 삭제가 아니라 info_title/info_content 초기화로 처리한다.
  @Transactional
  public RoadmapDto.Response clearOfficialRoadmapInfo(Long roadmapId) {
    Roadmap roadmap =
        roadmapRepository
            .findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    roadmap.updateIntro(null, null);
    return toRoadmapResponse(roadmap);
  }

  // 로드맵 삭제는 soft delete 로직만 수행한다.
  @Transactional
  public void deleteOfficialRoadmap(Long roadmapId) {
    Roadmap roadmap =
        roadmapRepository
            .findByRoadmapIdAndIsOfficialTrueAndIsDeletedFalse(roadmapId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));

    roadmap.deleteRoadmap();
  }

  // 컨트롤러에는 엔티티를 직접 반환하지 않고 Response DTO로 변환한다.
  private RoadmapDto.Response toRoadmapResponse(Roadmap roadmap) {
    return RoadmapDto.Response.builder()
        .roadmapId(roadmap.getRoadmapId())
        .title(roadmap.getTitle())
        .description(roadmap.getDescription())
        .infoTitle(roadmap.getInfoTitle())
        .infoContent(roadmap.getInfoContent())
        .isOfficial(roadmap.getIsOfficial())
        .createdAt(roadmap.getCreatedAt())
        .build();
  }

  private String blankToNull(String value) {
    if (value == null || value.trim().isEmpty()) {
      return null;
    }
    return value;
  }
}
