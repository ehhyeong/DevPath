package com.devpath.api.mentoring.service;

import com.devpath.api.mentoring.dto.MentoringMaterialRequest;
import com.devpath.api.mentoring.dto.MentoringMaterialResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.mentoring.entity.MentoringMaterial;
import com.devpath.domain.mentoring.entity.MentoringMaterialType;
import com.devpath.domain.mentoring.entity.MentoringMission;
import com.devpath.domain.mentoring.repository.MentoringMaterialRepository;
import com.devpath.domain.mentoring.repository.MentoringMissionRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MentoringMaterialService {

  private final MentoringMaterialRepository mentoringMaterialRepository;
  private final MentoringMissionRepository mentoringMissionRepository;

  @Transactional
  public MentoringMaterialResponse.Detail create(
      Long missionId, Long mentorId, MentoringMaterialRequest.Create request) {
    MentoringMission mission = getActiveMission(missionId);

    // 해당 미션이 속한 멘토링의 멘토만 자료를 등록할 수 있다.
    validateMentorOwner(mission, mentorId);

    // URL 타입은 url 필수, TEXT 타입은 content 필수로 검증한다.
    validateMaterialPayload(request.type(), request.content(), request.url());

    MentoringMaterial material =
        MentoringMaterial.builder()
            .mission(mission)
            .type(request.type())
            .title(request.title())
            .content(normalizeContent(request.type(), request.content()))
            .url(normalizeUrl(request.type(), request.url()))
            .sortOrder(request.sortOrder())
            .build();

    return MentoringMaterialResponse.Detail.from(mentoringMaterialRepository.save(material));
  }

  public List<MentoringMaterialResponse.Summary> getMaterials(Long missionId) {
    // 존재하지 않거나 삭제된 미션의 자료 목록 조회를 방지한다.
    getActiveMission(missionId);

    return mentoringMaterialRepository
        .findAllByMission_IdAndIsDeletedFalseOrderBySortOrderAscCreatedAtAsc(missionId)
        .stream()
        .map(MentoringMaterialResponse.Summary::from)
        .toList();
  }

  @Transactional
  public MentoringMaterialResponse.Detail update(
      Long materialId, Long mentorId, MentoringMaterialRequest.Update request) {
    MentoringMaterial material = getActiveMaterial(materialId);

    // 해당 자료가 속한 멘토링의 멘토만 자료를 수정할 수 있다.
    validateMentorOwner(material.getMission(), mentorId);

    // 수정 시에도 타입별 필수값을 동일하게 검증한다.
    validateMaterialPayload(request.type(), request.content(), request.url());

    // setter 대신 Entity의 의미 있는 비즈니스 메서드로 변경한다.
    material.update(
        request.type(),
        request.title(),
        normalizeContent(request.type(), request.content()),
        normalizeUrl(request.type(), request.url()),
        request.sortOrder());

    return MentoringMaterialResponse.Detail.from(material);
  }

  @Transactional
  public void delete(Long materialId, Long mentorId) {
    MentoringMaterial material = getActiveMaterial(materialId);

    // 해당 자료가 속한 멘토링의 멘토만 자료를 삭제할 수 있다.
    validateMentorOwner(material.getMission(), mentorId);

    // 물리 삭제 대신 Soft Delete를 적용한다.
    material.delete();
  }

  private MentoringMission getActiveMission(Long missionId) {
    // Soft Delete 된 미션은 자료 등록/조회 대상에서 제외한다.
    return mentoringMissionRepository
        .findByIdAndIsDeletedFalse(missionId)
        .orElseThrow(() -> new CustomException(ErrorCode.MENTORING_MISSION_NOT_FOUND));
  }

  private MentoringMaterial getActiveMaterial(Long materialId) {
    // Soft Delete 된 자료는 조회/수정/삭제 대상에서 제외한다.
    return mentoringMaterialRepository
        .findByIdAndIsDeletedFalse(materialId)
        .orElseThrow(() -> new CustomException(ErrorCode.MENTORING_MATERIAL_NOT_FOUND));
  }

  private void validateMentorOwner(MentoringMission mission, Long mentorId) {
    if (!mission.getMentoring().getMentor().getId().equals(mentorId)) {
      throw new CustomException(ErrorCode.MENTORING_MATERIAL_FORBIDDEN);
    }
  }

  private void validateMaterialPayload(MentoringMaterialType type, String content, String url) {
    if (type == MentoringMaterialType.URL && isBlank(url)) {
      throw new CustomException(ErrorCode.MENTORING_MATERIAL_INVALID_PAYLOAD);
    }

    if (type == MentoringMaterialType.TEXT && isBlank(content)) {
      throw new CustomException(ErrorCode.MENTORING_MATERIAL_INVALID_PAYLOAD);
    }
  }

  private String normalizeContent(MentoringMaterialType type, String content) {
    // URL 타입에서는 본문을 저장하지 않아 응답 의미를 명확히 한다.
    return type == MentoringMaterialType.TEXT ? content : null;
  }

  private String normalizeUrl(MentoringMaterialType type, String url) {
    // TEXT 타입에서는 URL을 저장하지 않아 응답 의미를 명확히 한다.
    return type == MentoringMaterialType.URL ? url : null;
  }

  private boolean isBlank(String value) {
    return value == null || value.trim().isEmpty();
  }
}
