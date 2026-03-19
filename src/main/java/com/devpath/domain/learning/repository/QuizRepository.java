package com.devpath.domain.learning.repository;

import com.devpath.domain.learning.entity.Quiz;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface QuizRepository extends JpaRepository<Quiz, Long> {

    // soft delete 되지 않은 퀴즈를 id 기준으로 단건 조회한다.
    Optional<Quiz> findByIdAndIsDeletedFalse(Long id);

    // 특정 로드맵 노드에 연결된 퀴즈를 최신 생성순으로 조회한다.
    @Query(
            """
            select q
            from Quiz q
            where q.roadmapNode.nodeId = :nodeId
              and q.isDeleted = false
            order by q.createdAt desc
            """
    )
    List<Quiz> findAllByRoadmapNodeIdAndIsDeletedFalseOrderByCreatedAtDesc(@Param("nodeId") Long nodeId);
}
