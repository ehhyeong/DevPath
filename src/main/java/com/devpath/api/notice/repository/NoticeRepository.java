package com.devpath.api.notice.repository;

import com.devpath.api.notice.entity.Notice;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

  List<Notice> findByIsDeletedFalseOrderByIsPinnedDescCreatedAtDesc();

  Optional<Notice> findByIdAndIsDeletedFalse(Long id);
}
