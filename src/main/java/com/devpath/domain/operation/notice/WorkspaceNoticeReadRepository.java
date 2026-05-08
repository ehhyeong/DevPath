package com.devpath.domain.operation.notice;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkspaceNoticeReadRepository extends JpaRepository<WorkspaceNoticeRead, Long> {

  boolean existsByNoticeIdAndUserId(Long noticeId, Long userId);

  @Query(
      """
            select r.noticeId
            from WorkspaceNoticeRead r
            where r.workspaceId = :workspaceId
              and r.userId = :userId
            """)
  List<Long> findNoticeIdsByWorkspaceIdAndUserId(
      @Param("workspaceId") Long workspaceId, @Param("userId") Long userId);

  @Query(
      """
            select count(r)
            from WorkspaceNoticeRead r
            where r.workspaceId = :workspaceId
              and r.userId = :userId
              and r.noticeId in (
                  select n.id
                  from WorkspaceNotice n
                  where n.workspaceId = :workspaceId
                    and n.isDeleted = false
              )
            """)
  long countActiveReadNotices(@Param("workspaceId") Long workspaceId, @Param("userId") Long userId);
}
