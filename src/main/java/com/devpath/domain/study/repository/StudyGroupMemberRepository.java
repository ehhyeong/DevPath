package com.devpath.domain.study.repository;

import com.devpath.domain.study.entity.StudyGroupJoinStatus;
import com.devpath.domain.study.entity.StudyGroupMember;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudyGroupMemberRepository extends JpaRepository<StudyGroupMember, Long> {

    Optional<StudyGroupMember> findByStudyGroupIdAndLearnerId(Long studyGroupId, Long learnerId);

    Optional<StudyGroupMember> findByIdAndStudyGroupId(Long id, Long studyGroupId);

    List<StudyGroupMember> findAllByLearnerIdAndJoinStatusOrderByJoinedAtDesc(
            Long learnerId,
            StudyGroupJoinStatus joinStatus
    );
}
