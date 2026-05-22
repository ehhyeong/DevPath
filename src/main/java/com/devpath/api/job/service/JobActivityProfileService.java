package com.devpath.api.job.service;

import com.devpath.api.job.dto.JobActivityProfileResponse;
import com.devpath.domain.learning.entity.proof.ProofCard;
import com.devpath.domain.learning.entity.proof.ProofCardStatus;
import com.devpath.domain.learning.entity.proof.ProofCardTag;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.proof.ProofCardTagRepository;
import com.devpath.domain.user.repository.UserRepository;
import com.devpath.domain.workspace.entity.Workspace;
import com.devpath.domain.workspace.entity.WorkspaceTask;
import com.devpath.domain.workspace.entity.WorkspaceTaskStatus;
import com.devpath.domain.workspace.repository.WorkspaceMemberRepository;
import com.devpath.domain.workspace.repository.WorkspaceRepository;
import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobActivityProfileService {

  private static final int MAX_SKILL_SIGNALS = 24;

  private static final List<SkillKeyword> SKILL_KEYWORDS =
      List.of(
          new SkillKeyword("FE", List.of("[fe]", "#fe", "frontend", "front-end")),
          new SkillKeyword("BE", List.of("[be]", "#be", "backend", "back-end")),
          new SkillKeyword("DevOps", List.of("devops", "dev ops", "infra", "infrastructure")),
          new SkillKeyword("Java", List.of("java")),
          new SkillKeyword("Spring Boot", List.of("spring boot", "springboot")),
          new SkillKeyword("JPA", List.of("jpa", "hibernate")),
          new SkillKeyword("PostgreSQL", List.of("postgresql", "postgres")),
          new SkillKeyword("MySQL", List.of("mysql")),
          new SkillKeyword("Redis", List.of("redis")),
          new SkillKeyword("Kafka", List.of("kafka")),
          new SkillKeyword("React", List.of("react")),
          new SkillKeyword("TypeScript", List.of("typescript", "type script")),
          new SkillKeyword("JavaScript", List.of("javascript")),
          new SkillKeyword("Next.js", List.of("next.js", "nextjs")),
          new SkillKeyword("Tailwind", List.of("tailwind")),
          new SkillKeyword("Docker", List.of("docker")),
          new SkillKeyword("Kubernetes", List.of("kubernetes", "k8s")),
          new SkillKeyword("AWS", List.of("aws", "ec2", "s3", "rds")),
          new SkillKeyword("CI/CD", List.of("ci/cd", "github actions", "jenkins")),
          new SkillKeyword("Python", List.of("python")),
          new SkillKeyword("SQL", List.of("sql")),
          new SkillKeyword("FastAPI", List.of("fastapi", "fast api")),
          new SkillKeyword("MLOps", List.of("mlops")),
          new SkillKeyword("Figma", List.of("figma")));

  private final WorkspaceMemberRepository workspaceMemberRepository;
  private final WorkspaceRepository workspaceRepository;
  private final WorkspaceTaskRepository workspaceTaskRepository;
  private final ProofCardRepository proofCardRepository;
  private final ProofCardTagRepository proofCardTagRepository;
  private final UserRepository userRepository;

  public JobActivityProfileResponse.Summary getMyActivityProfile(Long userId) {
    ActivityData activityData = loadActivityData(userId);
    Set<String> skillSignals = extractSkillSignals(activityData);

    return new JobActivityProfileResponse.Summary(
        countProjects(activityData),
        activityData.completedTasks().size(),
        activityData.proofCards().size(),
        calculateAverageProofCardScore(activityData.proofCards()),
        skillSignals.stream().toList());
  }

  public Set<String> collectSkillSignals(Long userId) {
    return extractSkillSignals(loadActivityData(userId));
  }

  private ActivityData loadActivityData(Long userId) {
    if (userId == null || !userRepository.existsById(userId)) {
      return ActivityData.empty();
    }

    List<Long> workspaceIds =
        workspaceMemberRepository.findAllByLearnerId(userId).stream()
            .map(member -> member.getWorkspaceId())
            .filter(Objects::nonNull)
            .distinct()
            .toList();

    List<Workspace> workspaceProjects =
        workspaceIds.isEmpty()
            ? List.of()
            : workspaceRepository.findAllByIdInAndIsDeletedFalseOrderByCreatedAtDesc(workspaceIds);

    List<Long> workspaceProjectIds = workspaceProjects.stream().map(Workspace::getId).toList();
    List<WorkspaceTask> completedTasks =
        workspaceProjectIds.isEmpty()
            ? List.of()
            : workspaceTaskRepository
                .findAllByWorkspaceIdInAndAssigneeIdAndStatusAndIsDeletedFalseOrderByUpdatedAtDesc(
                    workspaceProjectIds, userId, WorkspaceTaskStatus.DONE);

    List<ProofCard> proofCards =
        proofCardRepository.findAllByUserIdAndStatusOrderByIssuedAtDesc(
            userId, ProofCardStatus.ISSUED);
    List<Long> proofCardIds = proofCards.stream().map(ProofCard::getId).toList();
    List<ProofCardTag> proofCardTags =
        proofCardIds.isEmpty()
            ? List.of()
            : proofCardTagRepository.findAllByProofCardIdInOrderByProofCardIdAscIdAsc(
                proofCardIds);

    return new ActivityData(
        workspaceProjects, completedTasks, proofCards, proofCardTags);
  }

  private Set<String> extractSkillSignals(ActivityData activityData) {
    LinkedHashSet<String> skills = new LinkedHashSet<>();

    activityData.workspaceProjects().forEach(workspace -> addWorkspaceSkills(skills, workspace));
    activityData.completedTasks().forEach(task -> addTaskSkills(skills, task));
    addProofCardSkills(skills, activityData.proofCards(), activityData.proofCardTags());

    return skills.stream()
        .filter(this::isNotBlank)
        .limit(MAX_SKILL_SIGNALS)
        .collect(LinkedHashSet::new, LinkedHashSet::add, LinkedHashSet::addAll);
  }

  private void addWorkspaceSkills(Set<String> skills, Workspace workspace) {
    addKnownSkills(skills, workspace.getName());
    addKnownSkills(skills, workspace.getDescription());
  }

  private void addTaskSkills(Set<String> skills, WorkspaceTask task) {
    addKnownSkills(skills, task.getTitle());
    addKnownSkills(skills, task.getDescription());
  }

  private void addProofCardSkills(
      Set<String> skills, List<ProofCard> proofCards, List<ProofCardTag> proofCardTags) {
    proofCards.forEach(
        proofCard -> {
          addKnownSkills(skills, proofCard.getTitle());
          addKnownSkills(skills, proofCard.getDescription());
        });

    proofCardTags.forEach(
        proofCardTag -> {
          if (proofCardTag.getTag() != null) {
            addSkill(skills, proofCardTag.getTag().getName());
            addKnownSkills(skills, proofCardTag.getTag().getName());
          }
        });
  }

  private int countProjects(ActivityData activityData) {
    return activityData.workspaceProjects().size();
  }

  private double calculateAverageProofCardScore(List<ProofCard> proofCards) {
    List<BigDecimal> scores =
        proofCards.stream()
            .map(ProofCard::getNodeClearance)
            .filter(Objects::nonNull)
            .map(nodeClearance -> nodeClearance.getLessonCompletionRate())
            .filter(Objects::nonNull)
            .map(this::normalizeProofCardScore)
            .toList();

    if (scores.isEmpty()) {
      return 0.0;
    }

    BigDecimal total = scores.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
    return total.divide(BigDecimal.valueOf(scores.size()), 1, RoundingMode.HALF_UP).doubleValue();
  }

  private BigDecimal normalizeProofCardScore(BigDecimal rawScore) {
    BigDecimal score = rawScore.compareTo(BigDecimal.ONE) <= 0
        ? rawScore.multiply(BigDecimal.valueOf(100))
        : rawScore;
    return score.max(BigDecimal.ZERO).min(BigDecimal.valueOf(100));
  }

  private void addKnownSkills(Set<String> skills, String text) {
    if (!isNotBlank(text)) {
      return;
    }

    String normalizedText = normalize(text);
    String lowerText = text.toLowerCase(Locale.ROOT);

    for (SkillKeyword keyword : SKILL_KEYWORDS) {
      boolean matched =
          keyword.keywords().stream()
              .anyMatch(
                  alias ->
                      lowerText.contains(alias.toLowerCase(Locale.ROOT))
                          || (normalize(alias).length() > 2
                              && normalizedText.contains(normalize(alias))));

      if (matched) {
        addSkill(skills, keyword.skill());
      }
    }
  }

  private void addSkill(Set<String> skills, String value) {
    if (!isNotBlank(value)) {
      return;
    }

    skills.add(value.trim());
  }

  private String normalize(String value) {
    return value.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9+#.]", "");
  }

  private boolean isNotBlank(String value) {
    return value != null && !value.trim().isEmpty();
  }

  private record SkillKeyword(String skill, List<String> keywords) {}

  private record ActivityData(
      List<Workspace> workspaceProjects,
      List<WorkspaceTask> completedTasks,
      List<ProofCard> proofCards,
      List<ProofCardTag> proofCardTags) {

    private static ActivityData empty() {
      return new ActivityData(List.of(), List.of(), List.of(), List.of());
    }
  }
}
