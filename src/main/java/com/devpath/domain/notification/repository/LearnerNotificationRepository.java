package com.devpath.domain.notification.repository;

import com.devpath.domain.notification.entity.LearnerNotification;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearnerNotificationRepository extends JpaRepository<LearnerNotification, Long> {

  // 특정 사용자의 알림 목록을 최신순으로 조회한다.
  List<LearnerNotification> findAllByLearnerIdOrderByCreatedAtDesc(Long learnerId);

  // 특정 사용자의 알림만 읽음 처리할 수 있도록 learnerId까지 함께 조회한다.
  Optional<LearnerNotification> findByIdAndLearnerId(Long notificationId, Long learnerId);
}
