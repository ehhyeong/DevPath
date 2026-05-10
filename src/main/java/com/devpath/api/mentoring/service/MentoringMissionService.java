package com.devpath.api.mentoring.service;

import com.devpath.api.mentoring.dto.MentoringMissionRequest;
import com.devpath.api.mentoring.dto.MentoringMissionResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.mentoring.entity.Mentoring;
import com.devpath.domain.mentoring.entity.MentoringMission;
import com.devpath.domain.mentoring.repository.MentoringMissionRepository;
import com.devpath.domain.mentoring.repository.MentoringRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MentoringMissionService {

  private final MentoringMissionRepository mentoringMissionRepository;
  private final MentoringRepository mentoringRepository;

  @Transactional
  public MentoringMissionResponse.Detail create(
      Long mentoringId, Long mentorId, MentoringMissionRequest.Create request) {
    Mentoring mentoring = getActiveMentoring(mentoringId);

    // 해당 멘토링의 멘토만 미션을 생성할 수 있다.
    validateMentorOwner(mentoring, mentorId);

    // 같은 멘토링 안에서 같은 주차 미션 중복 생성을 방지한다.
    validateWeekNumberNotDuplicated(mentoring.getId(), request.weekNumber());

    MentoringMission mission =
        MentoringMission.builder()
            .mentoring(mentoring)
            .weekNumber(request.weekNumber())
            .title(request.title())
            .description(request.description())
            .dueAt(request.dueAt())
            .build();

    return MentoringMissionResponse.Detail.from(mentoringMissionRepository.save(mission));
  }

  public List<MentoringMissionResponse.Summary> getMissions(Long mentoringId) {
    // 존재하지 않거나 삭제된 멘토링에 대한 목록 조회를 방지한다.
    getActiveMentoring(mentoringId);

    return mentoringMissionRepository
        .findAllByMentoring_IdAndIsDeletedFalseOrderByWeekNumberAscCreatedAtAsc(mentoringId)
        .stream()
        .map(MentoringMissionResponse.Summary::from)
        .toList();
  }

  public MentoringMissionResponse.Detail getMission(Long missionId) {
    return MentoringMissionResponse.Detail.from(getActiveMission(missionId));
  }

  @Transactional
  public MentoringMissionResponse.Detail update(
      Long missionId, Long mentorId, MentoringMissionRequest.Update request) {
    MentoringMission mission = getActiveMission(missionId);

    // 해당 멘토링의 멘토만 미션을 수정할 수 있다.
    validateMentorOwner(mission.getMentoring(), mentorId);

    // 자기 자신을 제외하고 같은 주차 미션이 이미 있는지 확인한다.
    validateWeekNumberNotDuplicatedOnUpdate(
        mission.getMentoring().getId(), request.weekNumber(), mission.getId());

    // setter 대신 Entity의 의미 있는 비즈니스 메서드로 변경한다.
    mission.update(request.weekNumber(), request.title(), request.description(), request.dueAt());

    return MentoringMissionResponse.Detail.from(mission);
  }

  @Transactional
  public void delete(Long missionId, Long mentorId) {
    MentoringMission mission = getActiveMission(missionId);

    // 해당 멘토링의 멘토만 미션을 삭제할 수 있다.
    validateMentorOwner(mission.getMentoring(), mentorId);

    // 물리 삭제 대신 Soft Delete를 적용한다.
    mission.delete();
  }

  private Mentoring getActiveMentoring(Long mentoringId) {
    // Soft Delete 된 멘토링은 미션 생성/조회 대상에서 제외한다.
    return mentoringRepository
        .findByIdAndIsDeletedFalse(mentoringId)
        .orElseThrow(() -> new CustomException(ErrorCode.MENTORING_NOT_FOUND));
  }

  private MentoringMission getActiveMission(Long missionId) {
    // Soft Delete 된 미션은 조회/수정/삭제 대상에서 제외한다.
    return mentoringMissionRepository
        .findByIdAndIsDeletedFalse(missionId)
        .orElseThrow(() -> new CustomException(ErrorCode.MENTORING_MISSION_NOT_FOUND));
  }

  private void validateMentorOwner(Mentoring mentoring, Long mentorId) {
    if (!mentoring.getMentor().getId().equals(mentorId)) {
      throw new CustomException(ErrorCode.MENTORING_MISSION_FORBIDDEN);
    }
  }

  private void validateWeekNumberNotDuplicated(Long mentoringId, Integer weekNumber) {
    boolean exists =
        mentoringMissionRepository.existsByMentoring_IdAndWeekNumberAndIsDeletedFalse(
            mentoringId, weekNumber);

    if (exists) {
      throw new CustomException(ErrorCode.MENTORING_MISSION_WEEK_DUPLICATED);
    }
  }

  private void validateWeekNumberNotDuplicatedOnUpdate(
      Long mentoringId, Integer weekNumber, Long missionId) {
    boolean exists =
        mentoringMissionRepository.existsByMentoring_IdAndWeekNumberAndIdNotAndIsDeletedFalse(
            mentoringId, weekNumber, missionId);

    if (exists) {
      throw new CustomException(ErrorCode.MENTORING_MISSION_WEEK_DUPLICATED);
    }
  }
}
