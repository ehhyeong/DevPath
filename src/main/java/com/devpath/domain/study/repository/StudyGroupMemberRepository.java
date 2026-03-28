package com.devpath.domain.study.repository;

import com.devpath.domain.study.entity.StudyGroupMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StudyGroupMemberRepository extends JpaRepository<StudyGroupMember, Long> {
    // 특정 스터디에 이미 가입/신청했는지 중복 검사용
    Optional<StudyGroupMember> findByStudyGroupIdAndLearnerId(Long studyGroupId, Long learnerId);

    // 특정 스터디의 특정 가입 신청서(Member ID) 조회용
    Optional<StudyGroupMember> findByIdAndStudyGroupId(Long id, Long studyGroupId);
}