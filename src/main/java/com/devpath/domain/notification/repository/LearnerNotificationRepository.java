package com.devpath.domain.notification.repository;

import com.devpath.domain.notification.entity.LearnerNotification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerNotificationRepository extends JpaRepository<LearnerNotification, Long> {

  // 삭제되지 않은 특정 사용자의 알림 목록을 최신순으로 조회한다.
  List<LearnerNotification> findAllByLearnerIdAndIsDeletedFalseOrderByCreatedAtDesc(Long learnerId);

  // 특정 사용자의 삭제되지 않은 알림만 조회한다.
  Optional<LearnerNotification> findByIdAndLearnerIdAndIsDeletedFalse(
      Long notificationId, Long learnerId);
}
