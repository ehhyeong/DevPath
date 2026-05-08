package com.devpath.domain.study.repository;

import com.devpath.domain.study.entity.StudyMatch;
import com.devpath.domain.study.entity.StudyMatchStatus;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudyMatchRepository extends JpaRepository<StudyMatch, Long> {

  @Query(
      """
            select sm
            from StudyMatch sm
            where sm.requesterId = :learnerId
               or sm.receiverId = :learnerId
            order by sm.createdAt desc
            """)
  List<StudyMatch> findMyMatches(@Param("learnerId") Long learnerId);

  @Query(
      """
            select case when count(sm) > 0 then true else false end
            from StudyMatch sm
            where sm.status in :activeStatuses
              and sm.nodeId in :nodeIds
              and (
                    (sm.requesterId = :learnerId and sm.receiverId = :candidateLearnerId)
                 or (sm.requesterId = :candidateLearnerId and sm.receiverId = :learnerId)
              )
            """)
  boolean existsActiveMatchBetweenUsersForNodes(
      @Param("learnerId") Long learnerId,
      @Param("candidateLearnerId") Long candidateLearnerId,
      @Param("nodeIds") Collection<Long> nodeIds,
      @Param("activeStatuses") Collection<StudyMatchStatus> activeStatuses);

  default boolean existsActiveMatchBetweenUsersForNodes(
      Long learnerId, Long candidateLearnerId, Collection<Long> nodeIds) {
    return existsActiveMatchBetweenUsersForNodes(
        learnerId,
        candidateLearnerId,
        nodeIds,
        List.of(StudyMatchStatus.REQUESTED, StudyMatchStatus.ACCEPTED));
  }
}
