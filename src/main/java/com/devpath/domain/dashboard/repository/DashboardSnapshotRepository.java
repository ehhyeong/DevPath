package com.devpath.domain.dashboard.repository;

import com.devpath.domain.dashboard.entity.DashboardSnapshot;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DashboardSnapshotRepository extends JpaRepository<DashboardSnapshot, Long> {

    List<DashboardSnapshot> findAllByLearnerIdOrderBySnapshotDateAsc(Long learnerId);

    Optional<DashboardSnapshot> findTopByLearnerIdOrderBySnapshotDateDesc(Long learnerId);
}
