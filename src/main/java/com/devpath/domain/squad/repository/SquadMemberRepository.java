package com.devpath.domain.squad.repository;

import com.devpath.domain.squad.entity.Squad;
import com.devpath.domain.squad.entity.SquadMember;
import com.devpath.domain.user.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SquadMemberRepository extends JpaRepository<SquadMember, Long> {

  @Query("SELECT sm FROM SquadMember sm JOIN FETCH sm.user WHERE sm.squad = :squad")
  List<SquadMember> findBySquadWithUser(@Param("squad") Squad squad);

  Optional<SquadMember> findBySquadAndUser(Squad squad, User user);

  boolean existsBySquadAndUser(Squad squad, User user);
}
