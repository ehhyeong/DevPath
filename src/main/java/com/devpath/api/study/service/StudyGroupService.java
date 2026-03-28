package com.devpath.api.study.service;

import com.devpath.api.study.dto.StudyApplicationResponse;
import com.devpath.api.study.dto.StudyGroupRequest;
import com.devpath.api.study.dto.StudyGroupResponse;
import com.devpath.domain.study.entity.StudyGroup;
import com.devpath.domain.study.entity.StudyGroupJoinStatus;
import com.devpath.domain.study.entity.StudyGroupMember;
import com.devpath.domain.study.entity.StudyGroupStatus;
import com.devpath.domain.study.repository.StudyGroupMemberRepository;
import com.devpath.domain.study.repository.StudyGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyGroupService {

    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;

    /* ==============================================================
       1. 스터디 그룹 CRUD 로직
       ============================================================== */
    @Transactional
    public StudyGroupResponse createStudyGroup(StudyGroupRequest request) {
        StudyGroup studyGroup = StudyGroup.builder()
                .name(request.getName())
                .description(request.getDescription())
                .status(StudyGroupStatus.RECRUITING)
                .maxMembers(request.getMaxMembers())
                .build();
        return StudyGroupResponse.from(studyGroupRepository.save(studyGroup));
    }

    public StudyGroupResponse getStudyGroup(Long id) {
        StudyGroup studyGroup = getStudyGroupEntity(id);
        return StudyGroupResponse.from(studyGroup);
    }

    public List<StudyGroupResponse> getAllStudyGroups() {
        return studyGroupRepository.findAll().stream()
                .filter(group -> !group.getIsDeleted())
                .map(StudyGroupResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public StudyGroupResponse updateStudyGroup(Long groupId, StudyGroupRequest request) {
        StudyGroup studyGroup = getStudyGroupEntity(groupId);
        studyGroup.updateInfo(request.getName(), request.getDescription(), request.getMaxMembers());
        return StudyGroupResponse.from(studyGroup);
    }

    @Transactional
    public void deleteStudyGroup(Long groupId) {
        StudyGroup studyGroup = getStudyGroupEntity(groupId);
        studyGroup.markAsDeleted(); // Soft Delete (DB 삭제 안함)
    }

    @Transactional
    public StudyGroupResponse changeRecruitmentStatus(Long groupId, StudyGroupStatus status) {
        StudyGroup studyGroup = getStudyGroupEntity(groupId);
        studyGroup.changeStatus(status);
        return StudyGroupResponse.from(studyGroup);
    }

    /* ==============================================================
       2. 스터디 멤버 가입 및 승인 로직
       ============================================================== */
    @Transactional
    public StudyApplicationResponse applyForStudyGroup(Long groupId, Long learnerId) {
        StudyGroup studyGroup = getStudyGroupEntity(groupId);

        // 중복 신청 방어
        if (studyGroupMemberRepository.findByStudyGroupIdAndLearnerId(groupId, learnerId).isPresent()) {
            throw new IllegalArgumentException("이미 신청했거나 가입된 스터디입니다.");
        }

        StudyGroupMember member = StudyGroupMember.builder()
                .studyGroup(studyGroup)
                .learnerId(learnerId)
                .joinStatus(StudyGroupJoinStatus.PENDING) // 신청 시 기본값 PENDING
                .build();

        return StudyApplicationResponse.from(studyGroupMemberRepository.save(member));
    }

    @Transactional
    public StudyApplicationResponse approveApplication(Long groupId, Long applicationId) {
        StudyGroupMember member = studyGroupMemberRepository.findByIdAndStudyGroupId(applicationId, groupId)
                .orElseThrow(() -> new IllegalArgumentException("해당 신청 내역을 찾을 수 없습니다."));

        member.approveJoin(); // 비즈니스 메서드 호출 (상태 변경 및 시간 기록)
        return StudyApplicationResponse.from(member);
    }

    @Transactional
    public StudyApplicationResponse rejectApplication(Long groupId, Long applicationId) {
        StudyGroupMember member = studyGroupMemberRepository.findByIdAndStudyGroupId(applicationId, groupId)
                .orElseThrow(() -> new IllegalArgumentException("해당 신청 내역을 찾을 수 없습니다."));

        member.rejectJoin();
        return StudyApplicationResponse.from(member);
    }

    // 공통 내부 메서드 (예외 처리 통합)
    private StudyGroup getStudyGroupEntity(Long groupId) {
        StudyGroup group = studyGroupRepository.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("스터디 그룹을 찾을 수 없습니다."));
        if (group.getIsDeleted()) {
            throw new IllegalArgumentException("이미 삭제된 스터디 그룹입니다.");
        }
        return group;
    }
}