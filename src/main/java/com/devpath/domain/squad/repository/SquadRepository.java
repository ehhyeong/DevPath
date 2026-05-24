package com.devpath.domain.squad.repository;

import com.devpath.domain.squad.entity.Squad;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SquadRepository extends JpaRepository<Squad, Long> {

  List<Squad> findAllByIsDeletedFalseOrderByCreatedAtDesc();

  List<Squad> findAllByIsDeletedFalseAndIsArchivedFalseOrderByCreatedAtDesc();

  Optional<Squad> findByNameAndIsDeletedFalse(String name);

  Optional<Squad> findByIdAndIsDeletedFalse(Long id);

  Optional<Squad> findByIdAndIsDeletedFalseAndIsArchivedFalse(Long id);
}
