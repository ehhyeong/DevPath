package com.devpath.domain.study.repository;

import com.devpath.domain.study.entity.StudyGroup;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface StudyGroupRepository extends JpaRepository<StudyGroup, Long> {

    List<StudyGroup> findAllByIsDeletedFalseOrderByCreatedAtDesc();

    Optional<StudyGroup> findByIdAndIsDeletedFalse(Long groupId);
}
