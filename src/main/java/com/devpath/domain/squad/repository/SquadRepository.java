package com.devpath.domain.squad.repository;

import com.devpath.domain.squad.entity.Squad;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SquadRepository extends JpaRepository<Squad, Long> {

  // 삭제되지 않은 스쿼드 조회 (보관 포함)
  Optional<Squad> findByIdAndIsDeletedFalse(Long id);

  // 활성 스쿼드만 조회 (보관 제외)
  Optional<Squad> findByIdAndIsDeletedFalseAndIsArchivedFalse(Long id);
}
