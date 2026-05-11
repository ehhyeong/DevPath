package com.devpath.api.squad.service;

import com.devpath.api.squad.dto.SquadLoungePostRequest;
import com.devpath.api.squad.dto.SquadLoungePostResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.squad.entity.Squad;
import com.devpath.domain.squad.entity.SquadLoungeType;
import com.devpath.domain.squad.entity.SquadMember;
import com.devpath.domain.squad.entity.SquadRole;
import com.devpath.domain.squad.repository.SquadMemberRepository;
import com.devpath.domain.squad.repository.SquadRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SquadLoungePostService {

  private final SquadRepository squadRepository;
  private final SquadMemberRepository squadMemberRepository;
  private final UserRepository userRepository;

  public List<SquadLoungePostResponse> getPosts() {
    return squadRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc().stream()
        .map(this::toResponse)
        .toList();
  }

  @Transactional
  public SquadLoungePostResponse getPost(Long squadId) {
    Squad squad = findNonDeletedSquad(squadId);
    squad.increaseViewCount();
    return toResponse(squad);
  }

  @Transactional
  public SquadLoungePostResponse createPost(Long userId, SquadLoungePostRequest request) {
    User leader = getUser(userId);

    Squad squad = Squad.builder().name(request.getTitle().trim()).description(request.getDescription()).build();
    applyLoungeFields(squad, request);
    squadRepository.save(squad);

    SquadMember leaderMember =
        SquadMember.builder().squad(squad).user(leader).role(SquadRole.LEADER).build();
    squadMemberRepository.save(leaderMember);

    return SquadLoungePostResponse.from(squad, List.of(leaderMember));
  }

  @Transactional
  public SquadLoungePostResponse updatePost(
      Long squadId, Long userId, SquadLoungePostRequest request) {
    Squad squad = findActiveSquad(squadId);
    validateLeader(squad, userId);

    applyLoungeFields(squad, request);
    return toResponse(squad);
  }

  @Transactional
  public SquadLoungePostResponse closePost(Long squadId, Long userId) {
    Squad squad = findNonDeletedSquad(squadId);
    validateLeader(squad, userId);
    if (!Boolean.TRUE.equals(squad.getIsArchived())) {
      squad.archive();
    }
    return toResponse(squad);
  }

  private void applyLoungeFields(Squad squad, SquadLoungePostRequest request) {
    squad.updateLoungePost(
        request.getTitle().trim(),
        request.getDescription(),
        parseType(request.getType()),
        request.getDeadline(),
        normalizeMaxMembers(request),
        joinCsv(request.getTags()),
        joinCsv(request.getRoles()));
  }

  private SquadLoungePostResponse toResponse(Squad squad) {
    return SquadLoungePostResponse.from(squad, squadMemberRepository.findBySquadWithUser(squad));
  }

  private Integer normalizeMaxMembers(SquadLoungePostRequest request) {
    if (request.getMaxMembers() != null) {
      return Math.max(1, request.getMaxMembers());
    }
    return parseType(request.getType()) == SquadLoungeType.JOIN_WISH ? 1 : 4;
  }

  private SquadLoungeType parseType(String rawType) {
    if (rawType == null || rawType.isBlank()) {
      return SquadLoungeType.PROJECT;
    }
    try {
      return SquadLoungeType.valueOf(rawType.trim().toUpperCase());
    } catch (IllegalArgumentException ex) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "지원하지 않는 스쿼드 유형입니다.");
    }
  }

  private String joinCsv(List<String> values) {
    if (values == null || values.isEmpty()) {
      return null;
    }
    String joined =
        values.stream()
            .map(value -> value == null ? "" : value.replace(",", " ").trim())
            .filter(value -> !value.isBlank())
            .distinct()
            .reduce((left, right) -> left + "," + right)
            .orElse("");
    return joined.isBlank() ? null : joined;
  }

  private Squad findActiveSquad(Long squadId) {
    return squadRepository
        .findByIdAndIsDeletedFalseAndIsArchivedFalse(squadId)
        .orElseThrow(() -> new CustomException(ErrorCode.SQUAD_NOT_FOUND));
  }

  private Squad findNonDeletedSquad(Long squadId) {
    return squadRepository
        .findByIdAndIsDeletedFalse(squadId)
        .orElseThrow(() -> new CustomException(ErrorCode.SQUAD_NOT_FOUND));
  }

  private void validateLeader(Squad squad, Long userId) {
    User user = getUser(userId);
    SquadMember member =
        squadMemberRepository
            .findBySquadAndUser(squad, user)
            .orElseThrow(() -> new CustomException(ErrorCode.SQUAD_MEMBER_NOT_FOUND));
    if (member.getRole() != SquadRole.LEADER) {
      throw new CustomException(ErrorCode.SQUAD_FORBIDDEN);
    }
  }

  private User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }
}
