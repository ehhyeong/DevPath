package com.devpath.domain.notification.repository;

import com.devpath.domain.notification.entity.LearnerNotification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerNotificationRepository extends JpaRepository<LearnerNotification, Long> {

    List<LearnerNotification> findAllByLearnerIdOrderByCreatedAtDesc(Long learnerId);

    Optional<LearnerNotification> findByIdAndLearnerId(Long notificationId, Long learnerId);
}
