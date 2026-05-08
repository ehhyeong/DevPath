package com.devpath.domain.showcase.repository;

import com.devpath.domain.showcase.entity.Showcase;
import com.devpath.domain.showcase.entity.ShowcaseCategory;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShowcaseRepository extends JpaRepository<Showcase, Long> {

  Optional<Showcase> findByIdAndIsDeletedFalse(Long id);

  List<Showcase> findAllByIsDeletedFalseOrderByCreatedAtDesc();

  List<Showcase> findAllByCategoryAndIsDeletedFalseOrderByCreatedAtDesc(ShowcaseCategory category);

  List<Showcase> findAllByIsDeletedFalseOrderByViewCountDesc();

  List<Showcase> findAllByCategoryAndIsDeletedFalseOrderByViewCountDesc(ShowcaseCategory category);
}
