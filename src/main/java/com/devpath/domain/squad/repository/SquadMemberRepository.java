package com.devpath.domain.squad.repository;

import com.devpath.domain.squad.entity.Squad;
import com.devpath.domain.squad.entity.SquadMember;
import com.devpath.domain.squad.entity.SquadRole;
import com.devpath.domain.user.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SquadMemberRepository extends JpaRepository<SquadMember, Long> {

  @Query(
      """
      SELECT sm
      FROM SquadMember sm
      JOIN FETCH sm.user
      WHERE sm.squad = :squad
        AND sm.isDeleted = false
      ORDER BY sm.joinedAt ASC
      """)
  List<SquadMember> findBySquadWithUser(@Param("squad") Squad squad);

  @Query(
      """
      SELECT sm
      FROM SquadMember sm
      JOIN FETCH sm.squad
      WHERE sm.user = :user
        AND sm.isDeleted = false
        AND sm.squad.isDeleted = false
      ORDER BY sm.joinedAt DESC
      """)
  List<SquadMember> findActiveMembershipsByUser(@Param("user") User user);

  Optional<SquadMember> findBySquadAndUserAndIsDeletedFalse(Squad squad, User user);

  default Optional<SquadMember> findBySquadAndUser(Squad squad, User user) {
    return findBySquadAndUserAndIsDeletedFalse(squad, user);
  }

  boolean existsBySquadAndUserAndIsDeletedFalse(Squad squad, User user);

  default boolean existsBySquadAndUser(Squad squad, User user) {
    return existsBySquadAndUserAndIsDeletedFalse(squad, user);
  }

  Optional<SquadMember> findByIdAndSquadAndIsDeletedFalse(Long id, Squad squad);

  long countBySquadAndRoleAndIsDeletedFalse(Squad squad, SquadRole role);
}
