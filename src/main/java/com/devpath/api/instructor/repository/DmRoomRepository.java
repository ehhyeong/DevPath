package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.DmRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DmRoomRepository extends JpaRepository<DmRoom, Long> {

    Optional<DmRoom> findByInstructorIdAndLearnerIdAndIsDeletedFalse(Long instructorId, Long learnerId);

    Optional<DmRoom> findByIdAndIsDeletedFalse(Long id);
}