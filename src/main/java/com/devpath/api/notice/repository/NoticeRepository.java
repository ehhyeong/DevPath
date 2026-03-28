package com.devpath.api.notice.repository;

import com.devpath.api.notice.entity.Notice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    List<Notice> findByIsDeletedFalseOrderByIsPinnedDescCreatedAtDesc();

    Optional<Notice> findByIdAndIsDeletedFalse(Long id);
}