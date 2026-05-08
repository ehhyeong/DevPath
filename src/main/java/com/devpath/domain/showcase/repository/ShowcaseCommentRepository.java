package com.devpath.domain.showcase.repository;

import com.devpath.domain.showcase.entity.ShowcaseComment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ShowcaseCommentRepository extends JpaRepository<ShowcaseComment, Long> {

  Optional<ShowcaseComment> findByIdAndIsDeletedFalse(Long id);

  List<ShowcaseComment> findAllByShowcaseIdAndIsDeletedFalseOrderByCreatedAtAsc(Long showcaseId);
}
