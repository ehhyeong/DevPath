package com.devpath.api.study.service;

import com.devpath.api.study.dto.StudyApplicationResponse;
import com.devpath.api.study.dto.StudyGroupRequest;
import com.devpath.api.study.dto.StudyGroupResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.study.entity.StudyGroup;
import com.devpath.domain.study.entity.StudyGroupJoinStatus;
import com.devpath.domain.study.entity.StudyGroupMember;
import com.devpath.domain.study.entity.StudyGroupStatus;
import com.devpath.domain.study.repository.StudyGroupMemberRepository;
import com.devpath.domain.study.repository.StudyGroupRepository;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudyGroupService {

    private final StudyGroupRepository studyGroupRepository;
    private final StudyGroupMemberRepository studyGroupMemberRepository;

    @Transactional
    public StudyGroupResponse createStudyGroup(Long learnerId, StudyGroupRequest request) {
        validateMaxMembers(request.getMaxMembers());

        StudyGroup studyGroup = StudyGroup.builder()
                .name(request.getName())
                .description(request.getDescription())
                .status(StudyGroupStatus.RECRUITING)
                .maxMembers(request.getMaxMembers())
                .build();

        StudyGroup savedStudyGroup = studyGroupRepository.save(studyGroup);

        StudyGroupMember ownerMembership = StudyGroupMember.builder()
                .studyGroup(savedStudyGroup)
                .learnerId(learnerId)
                .joinStatus(StudyGroupJoinStatus.APPROVED)
                .joinedAt(LocalDateTime.now())
                .build();
        studyGroupMemberRepository.save(ownerMembership);

        return StudyGroupResponse.from(savedStudyGroup);
    }

    public StudyGroupResponse getStudyGroup(Long groupId) {
        return StudyGroupResponse.from(getStudyGroupEntity(groupId));
    }

    public List<StudyGroupResponse> getAllStudyGroups() {
        return studyGroupRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc().stream()
                .map(StudyGroupResponse::from)
                .toList();
    }

    @Transactional
    public StudyGroupResponse updateStudyGroup(Long groupId, Long learnerId, StudyGroupRequest request) {
        validateMaxMembers(request.getMaxMembers());

        StudyGroup studyGroup = getStudyGroupEntity(groupId);
        validateApprovedMember(groupId, learnerId);

        long approvedMemberCount = studyGroupMemberRepository.countByStudyGroupIdAndJoinStatus(
                groupId,
                StudyGroupJoinStatus.APPROVED
        );
        if (request.getMaxMembers() < approvedMemberCount) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "현재 승인된 인원 수보다 최대 인원 수를 작게 설정할 수 없습니다.");
        }

        studyGroup.updateInfo(request.getName(), request.getDescription(), request.getMaxMembers());
        return StudyGroupResponse.from(studyGroup);
    }

    @Transactional
    public void deleteStudyGroup(Long groupId, Long learnerId) {
        StudyGroup studyGroup = getStudyGroupEntity(groupId);
        validateApprovedMember(groupId, learnerId);

        studyGroup.markAsDeleted();
    }

    @Transactional
    public StudyGroupResponse changeRecruitmentStatus(Long groupId, Long learnerId, StudyGroupStatus status) {
        StudyGroup studyGroup = getStudyGroupEntity(groupId);
        validateApprovedMember(groupId, learnerId);

        if (studyGroup.getStatus() == StudyGroupStatus.CANCELLED || studyGroup.getStatus() == StudyGroupStatus.COMPLETED) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "종료된 스터디 그룹의 상태는 변경할 수 없습니다.");
        }

        studyGroup.changeStatus(status);
        return StudyGroupResponse.from(studyGroup);
    }

    @Transactional
    public StudyApplicationResponse applyForStudyGroup(Long groupId, Long learnerId) {
        StudyGroup studyGroup = getStudyGroupEntity(groupId);

        if (studyGroup.getStatus() != StudyGroupStatus.RECRUITING) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "모집 중인 스터디 그룹에만 신청할 수 있습니다.");
        }

        if (studyGroupMemberRepository.findByStudyGroupIdAndLearnerId(groupId, learnerId).isPresent()) {
            throw new CustomException(ErrorCode.DUPLICATE_RESOURCE, "이미 신청했거나 참여 중인 스터디 그룹입니다.");
        }

        validateStudyGroupCapacity(groupId, studyGroup.getMaxMembers());

        StudyGroupMember member = StudyGroupMember.builder()
                .studyGroup(studyGroup)
                .learnerId(learnerId)
                .joinStatus(StudyGroupJoinStatus.PENDING)
                .build();

        return StudyApplicationResponse.from(studyGroupMemberRepository.save(member));
    }

    @Transactional
    public StudyApplicationResponse approveApplication(Long groupId, Long applicationId, Long learnerId) {
        validateApprovedMember(groupId, learnerId);

        StudyGroup studyGroup = getStudyGroupEntity(groupId);
        validateStudyGroupCapacity(groupId, studyGroup.getMaxMembers());

        StudyGroupMember member = studyGroupMemberRepository.findByIdAndStudyGroupId(applicationId, groupId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "해당 신청 내역을 찾을 수 없습니다."));

        if (member.getJoinStatus() != StudyGroupJoinStatus.PENDING) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "대기 중인 신청만 승인할 수 있습니다.");
        }

        member.approveJoin();
        return StudyApplicationResponse.from(member);
    }

    @Transactional
    public StudyApplicationResponse rejectApplication(Long groupId, Long applicationId, Long learnerId) {
        validateApprovedMember(groupId, learnerId);

        StudyGroupMember member = studyGroupMemberRepository.findByIdAndStudyGroupId(applicationId, groupId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "해당 신청 내역을 찾을 수 없습니다."));

        if (member.getJoinStatus() != StudyGroupJoinStatus.PENDING) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "대기 중인 신청만 거절할 수 있습니다.");
        }

        member.rejectJoin();
        return StudyApplicationResponse.from(member);
    }

    private StudyGroup getStudyGroupEntity(Long groupId) {
        return studyGroupRepository.findByIdAndIsDeletedFalse(groupId)
                .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND, "스터디 그룹을 찾을 수 없습니다."));
    }

    private void validateApprovedMember(Long groupId, Long learnerId) {
        studyGroupMemberRepository.findByStudyGroupIdAndLearnerIdAndJoinStatus(
                        groupId,
                        learnerId,
                        StudyGroupJoinStatus.APPROVED
                )
                .orElseThrow(() -> new CustomException(ErrorCode.UNAUTHORIZED_ACTION, "승인된 스터디 멤버만 해당 작업을 수행할 수 있습니다."));
    }

    private void validateMaxMembers(Integer maxMembers) {
        if (maxMembers == null || maxMembers < 2) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "최대 인원 수는 2명 이상이어야 합니다.");
        }
    }

    private void validateStudyGroupCapacity(Long groupId, Integer maxMembers) {
        long approvedCount = studyGroupMemberRepository.countByStudyGroupIdAndJoinStatus(
                groupId,
                StudyGroupJoinStatus.APPROVED
        );

        if (approvedCount >= maxMembers) {
            throw new CustomException(ErrorCode.INVALID_INPUT, "이미 정원이 가득 찬 스터디 그룹입니다.");
        }
    }
}
