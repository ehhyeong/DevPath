package com.devpath.api.instructor.repository;

import com.devpath.api.instructor.entity.InstructorSubscription;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InstructorSubscriptionRepository
    extends JpaRepository<InstructorSubscription, Long> {

  Optional<InstructorSubscription> findByChannelIdAndLearnerId(Long channelId, Long learnerId);

  Optional<InstructorSubscription> findByChannelIdAndLearnerIdAndIsDeletedFalse(
      Long channelId, Long learnerId);
}
