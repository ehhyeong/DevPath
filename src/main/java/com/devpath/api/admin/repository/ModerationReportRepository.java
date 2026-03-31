package com.devpath.api.admin.repository;

import com.devpath.api.admin.entity.ModerationActionType;
import com.devpath.api.admin.entity.ModerationReport;
import com.devpath.api.admin.entity.ModerationReportStatus;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ModerationReportRepository extends JpaRepository<ModerationReport, Long> {

    Optional<ModerationReport> findByIdAndStatus(Long id, ModerationReportStatus status);

    long countByStatus(ModerationReportStatus status);

    long countByActionTaken(ModerationActionType actionTaken);
}
