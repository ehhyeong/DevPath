package com.devpath.domain.notification.repository;

import com.devpath.domain.notification.entity.InstructorNotification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstructorNotificationRepository
    extends JpaRepository<InstructorNotification, Long> {

  List<InstructorNotification> findAllByInstructorIdOrderByCreatedAtDesc(Long instructorId);

  Optional<InstructorNotification> findByIdAndInstructorId(Long notificationId, Long instructorId);
}
