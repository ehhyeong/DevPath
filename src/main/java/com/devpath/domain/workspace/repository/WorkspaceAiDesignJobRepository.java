package com.devpath.domain.workspace.repository;

import com.devpath.domain.workspace.entity.WorkspaceAiDesignJob;
import com.devpath.domain.workspace.entity.WorkspaceAiDesignJobStatus;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WorkspaceAiDesignJobRepository extends JpaRepository<WorkspaceAiDesignJob, UUID> {

  Optional<WorkspaceAiDesignJob> findByIdAndUserId(UUID id, Long userId);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select job from WorkspaceAiDesignJob job where job.id = :id and job.userId = :userId")
  Optional<WorkspaceAiDesignJob> findOwnedForUpdate(
      @Param("id") UUID id, @Param("userId") Long userId);

  Optional<WorkspaceAiDesignJob> findFirstByUserIdAndStatusInOrderByCreatedAtDesc(
      Long userId, Collection<WorkspaceAiDesignJobStatus> statuses);

  List<WorkspaceAiDesignJob> findAllByStatus(WorkspaceAiDesignJobStatus status);

  @Modifying(clearAutomatically = true)
  @Query(
      "update WorkspaceAiDesignJob job set job.status = com.devpath.domain.workspace.entity.WorkspaceAiDesignJobStatus.PROCESSING, job.processingStartedAt = :startedAt where job.id = :id and job.status = com.devpath.domain.workspace.entity.WorkspaceAiDesignJobStatus.PENDING")
  int claim(@Param("id") UUID id, @Param("startedAt") Instant startedAt);

  @Modifying(clearAutomatically = true)
  @Query(
      "update WorkspaceAiDesignJob job set job.status = com.devpath.domain.workspace.entity.WorkspaceAiDesignJobStatus.PENDING, job.processingStartedAt = null where job.status = com.devpath.domain.workspace.entity.WorkspaceAiDesignJobStatus.PROCESSING and (job.processingStartedAt is null or job.processingStartedAt < :cutoff)")
  int resetStaleProcessing(@Param("cutoff") Instant cutoff);
}
