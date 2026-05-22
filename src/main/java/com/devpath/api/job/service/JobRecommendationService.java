package com.devpath.api.job.service;

import com.devpath.api.job.dto.JobRecommendationRequest;
import com.devpath.api.job.dto.JobRecommendationResponse;
import com.devpath.domain.job.entity.JobPosting;
import com.devpath.domain.job.entity.JobPostingStatus;
import com.devpath.domain.job.entity.JobSkillTag;
import com.devpath.domain.job.repository.JobPostingRepository;
import com.devpath.domain.job.repository.JobSkillTagRepository;
import com.devpath.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobRecommendationService {

  private static final int REGION_MATCH_SCORE = 10;
  private static final int CAREER_LEVEL_MATCH_SCORE = 10;
  private static final int SKILL_MATCH_SCORE = 15;

  private final JobPostingRepository jobPostingRepository;
  private final JobSkillTagRepository jobSkillTagRepository;
  private final UserRepository userRepository;
  private final JobActivityProfileService jobActivityProfileService;

  public List<JobRecommendationResponse.Recommendation> getMyRecommendations(
      JobRecommendationRequest.SearchCondition condition) {
    validateUserIfPresent(condition.userId());

    List<JobPosting> openJobs =
        jobPostingRepository
            .findAllByStatusAndIsDeletedFalseOrderByCreatedAtDesc(JobPostingStatus.OPEN)
            .stream()
            .filter(job -> matchesRegion(job, condition.region()))
            .filter(job -> matchesCareerLevel(job, condition.careerLevel()))
            .toList();

    if (openJobs.isEmpty()) {
      return List.of();
    }

    Set<String> userSkillSignals = buildUserSkillSignals(condition);
    Map<Long, List<String>> jobSkillTagMap = loadJobSkillTagMap(openJobs);

    return openJobs.stream()
        .map(job -> toRecommendation(job, condition, userSkillSignals, jobSkillTagMap))
        .sorted(
            Comparator.comparing(JobRecommendationResponse.Recommendation::recommendationScore)
                .reversed()
                .thenComparing(JobRecommendationResponse.Recommendation::jobId))
        .toList();
  }

  private JobRecommendationResponse.Recommendation toRecommendation(
      JobPosting job,
      JobRecommendationRequest.SearchCondition condition,
      Set<String> userSkillSignals,
      Map<Long, List<String>> jobSkillTagMap) {
    List<String> jobSkillTags = jobSkillTagMap.getOrDefault(job.getId(), List.of());
    List<String> matchedSkills = findMatchedSkills(userSkillSignals, jobSkillTags);
    int score = calculateScore(job, condition, matchedSkills);

    return JobRecommendationResponse.Recommendation.from(job, score, matchedSkills);
  }

  private int calculateScore(
      JobPosting job,
      JobRecommendationRequest.SearchCondition condition,
      List<String> matchedSkills) {
    int score = 0;

    if (isNotBlank(condition.region()) && equalsIgnoreCase(job.getRegion(), condition.region())) {
      score += REGION_MATCH_SCORE;
    }

    if (isNotBlank(condition.careerLevel())
        && equalsIgnoreCase(job.getCareerLevel(), condition.careerLevel())) {
      score += CAREER_LEVEL_MATCH_SCORE;
    }

    score += matchedSkills.size() * SKILL_MATCH_SCORE;
    return score;
  }

  private Map<Long, List<String>> loadJobSkillTagMap(List<JobPosting> jobs) {
    List<Long> jobIds = jobs.stream().map(JobPosting::getId).toList();

    return jobSkillTagRepository.findAllByJobPosting_IdInAndIsDeletedFalse(jobIds).stream()
        .collect(
            Collectors.groupingBy(
                tag -> tag.getJobPosting().getId(),
                Collectors.mapping(JobSkillTag::getName, Collectors.toList())));
  }

  private Set<String> buildUserSkillSignals(JobRecommendationRequest.SearchCondition condition) {
    Set<String> skills = new LinkedHashSet<>();

    if (condition.userId() != null) {
      skills.addAll(jobActivityProfileService.collectSkillSignals(condition.userId()));
    }
    skills.addAll(parseCsv(condition.skillTags()));
    skills.addAll(parseCsv(condition.proofCardSkills()));
    skills.addAll(parseCsv(condition.completedRoadmapSkills()));

    return skills;
  }

  private List<String> findMatchedSkills(Set<String> userSkillSignals, List<String> jobSkillTags) {
    if (userSkillSignals.isEmpty() || jobSkillTags.isEmpty()) {
      return List.of();
    }

    List<String> matchedSkills = new ArrayList<>();

    for (String jobSkillTag : jobSkillTags) {
      boolean matched =
          userSkillSignals.stream().anyMatch(userSkill -> equalsIgnoreCase(userSkill, jobSkillTag));

      if (matched) {
        matchedSkills.add(jobSkillTag);
      }
    }

    return matchedSkills;
  }

  private boolean matchesRegion(JobPosting job, String region) {
    if (!isNotBlank(region)) {
      return true;
    }

    return equalsIgnoreCase(job.getRegion(), region);
  }

  private boolean matchesCareerLevel(JobPosting job, String careerLevel) {
    if (!isNotBlank(careerLevel)) {
      return true;
    }

    return equalsIgnoreCase(job.getCareerLevel(), careerLevel);
  }

  private List<String> parseCsv(String value) {
    if (!isNotBlank(value)) {
      return List.of();
    }

    return List.of(value.split(",")).stream().map(String::trim).filter(this::isNotBlank).toList();
  }

  private void validateUserIfPresent(Long userId) {
    if (userId == null) {
      return;
    }

    userRepository.existsById(userId);
  }

  private boolean equalsIgnoreCase(String source, String target) {
    if (source == null || target == null) {
      return false;
    }

    return source.trim().toLowerCase(Locale.ROOT).equals(target.trim().toLowerCase(Locale.ROOT));
  }

  private boolean isNotBlank(String value) {
    return value != null && !value.trim().isEmpty();
  }
}
