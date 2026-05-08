package com.devpath.domain.squad.repository;

import com.devpath.domain.squad.entity.Squad;
import com.devpath.domain.squad.entity.SquadInvitation;
import com.devpath.domain.squad.entity.SquadInvitationStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SquadInvitationRepository extends JpaRepository<SquadInvitation, Long> {

  boolean existsBySquadAndInviteeIdAndStatus(
      Squad squad, Long inviteeId, SquadInvitationStatus status);

  Optional<SquadInvitation> findBySquadAndInviteeIdAndStatus(
      Squad squad, Long inviteeId, SquadInvitationStatus status);

  List<SquadInvitation> findByInviteeIdAndStatus(Long inviteeId, SquadInvitationStatus status);
}
