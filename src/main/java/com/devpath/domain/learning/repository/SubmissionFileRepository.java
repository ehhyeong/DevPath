package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.SubmissionFile;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubmissionFileRepository extends JpaRepository<SubmissionFile, Long> {

    // soft delete 되지 않은 제출 파일을 id 기준으로 단건 조회한다.
    Optional<SubmissionFile> findByIdAndIsDeletedFalse(Long id);

    // 특정 제출에 속한 파일 목록을 생성 시각 오름차순으로 조회한다.
    List<SubmissionFile> findAllBySubmissionIdAndIsDeletedFalseOrderByCreatedAtAsc(Long submissionId);
}
