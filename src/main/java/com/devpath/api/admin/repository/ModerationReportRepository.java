package com.devpath.api.admin.repository;

import com.devpath.api.admin.entity.ModerationActionType;
import com.devpath.api.admin.entity.ModerationReport;
import com.devpath.api.admin.entity.ModerationReportStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ModerationReportRepository extends JpaRepository<ModerationReport, Long> {

  // 처리 대기 신고만 선택해서 후속 조치 시점의 상태 경합을 줄인다.
  Optional<ModerationReport> findByIdAndStatus(Long id, ModerationReportStatus status);

  // 신고 목록은 최신 접수 순으로 보여주기 위해 생성 시각 기준으로 정렬한다.
  List<ModerationReport> findAllByStatusOrderByCreatedAtDesc(ModerationReportStatus status);

  long countByStatus(ModerationReportStatus status);

  long countByActionTaken(ModerationActionType actionTaken);
}
