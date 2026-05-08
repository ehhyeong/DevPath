package com.devpath.api.job.service;

import com.devpath.api.job.dto.JobSkillTagResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.job.entity.JobPosting;
import com.devpath.domain.job.entity.JobSkillTag;
import com.devpath.domain.job.entity.JobSkillTagSource;
import com.devpath.domain.job.repository.JobPostingRepository;
import com.devpath.domain.job.repository.JobSkillTagRepository;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class JobSkillTagService {

  private static final Map<String, List<String>> SKILL_KEYWORDS = createSkillKeywords();

  private final JobPostingRepository jobPostingRepository;
  private final JobSkillTagRepository jobSkillTagRepository;

  @Transactional
  public JobSkillTagResponse.AnalysisResult analyzeJd(Long jobId) {
    JobPosting jobPosting = getActiveJob(jobId);

    softDeleteExistingTags(jobPosting.getId());

    List<JobSkillTag> extractedTags = extractSkillTags(jobPosting);
    List<JobSkillTag> savedTags = jobSkillTagRepository.saveAll(extractedTags);

    return JobSkillTagResponse.AnalysisResult.of(
        jobPosting.getId(), jobPosting.getTitle(), savedTags);
  }

  public List<JobSkillTagResponse.Detail> getSkillTags(Long jobId) {
    getActiveJob(jobId);

    return jobSkillTagRepository
        .findAllByJobPosting_IdAndIsDeletedFalseOrderByNameAsc(jobId)
        .stream()
        .map(JobSkillTagResponse.Detail::from)
        .toList();
  }

  public List<JobSkillTagResponse.Popular> getPopularSkillTags() {
    return jobSkillTagRepository.findPopularSkillTags().stream()
        .map(JobSkillTagResponse.Popular::from)
        .toList();
  }

  private JobPosting getActiveJob(Long jobId) {
    return jobPostingRepository
        .findByIdAndIsDeletedFalse(jobId)
        .orElseThrow(() -> new CustomException(ErrorCode.JOB_POSTING_NOT_FOUND));
  }

  private void softDeleteExistingTags(Long jobId) {
    jobSkillTagRepository
        .findAllByJobPosting_IdAndIsDeletedFalse(jobId)
        .forEach(JobSkillTag::delete);
  }

  private List<JobSkillTag> extractSkillTags(JobPosting jobPosting) {
    String normalizedText = buildAnalysisTargetText(jobPosting).toLowerCase(Locale.ROOT);
    Map<String, String> matchedTags = new LinkedHashMap<>();

    SKILL_KEYWORDS.forEach(
        (tagName, keywords) ->
            keywords.stream()
                .filter(normalizedText::contains)
                .findFirst()
                .ifPresent(matchedKeyword -> matchedTags.put(tagName, matchedKeyword)));

    List<JobSkillTag> tags = new ArrayList<>();

    matchedTags.forEach(
        (tagName, matchedKeyword) ->
            tags.add(
                JobSkillTag.builder()
                    .jobPosting(jobPosting)
                    .name(tagName)
                    .source(JobSkillTagSource.JD_RULE_BASED)
                    .confidenceScore(calculateConfidenceScore(tagName, matchedKeyword))
                    .matchedKeyword(matchedKeyword)
                    .build()));

    return tags;
  }

  private String buildAnalysisTargetText(JobPosting jobPosting) {
    return String.join(
        "\n",
        nullToEmpty(jobPosting.getTitle()),
        nullToEmpty(jobPosting.getJobRole()),
        nullToEmpty(jobPosting.getDescription()),
        nullToEmpty(jobPosting.getRequiredSkills()));
  }

  private Double calculateConfidenceScore(String tagName, String matchedKeyword) {
    if (tagName.toLowerCase(Locale.ROOT).equals(matchedKeyword)) {
      return 0.95;
    }

    return 0.85;
  }

  private String nullToEmpty(String value) {
    return value == null ? "" : value;
  }

  private static Map<String, List<String>> createSkillKeywords() {
    Map<String, List<String>> skillKeywords = new LinkedHashMap<>();
    skillKeywords.put("Java", List.of("java", "jdk", "jvm"));
    skillKeywords.put("Spring", List.of("spring", "spring framework"));
    skillKeywords.put("Spring Boot", List.of("spring boot", "springboot"));
    skillKeywords.put("JPA", List.of("jpa", "hibernate"));
    skillKeywords.put("PostgreSQL", List.of("postgresql", "postgres"));
    skillKeywords.put("MySQL", List.of("mysql"));
    skillKeywords.put("Redis", List.of("redis"));
    skillKeywords.put("React", List.of("react", "react.js", "reactjs"));
    skillKeywords.put("TypeScript", List.of("typescript", "ts"));
    skillKeywords.put("JavaScript", List.of("javascript", "js"));
    skillKeywords.put("Docker", List.of("docker", "container"));
    skillKeywords.put("Kubernetes", List.of("kubernetes", "k8s"));
    skillKeywords.put("AWS", List.of("aws", "amazon web services", "ec2", "s3", "rds"));
    skillKeywords.put("Git", List.of("git", "github", "gitlab"));
    skillKeywords.put("CI/CD", List.of("ci/cd", "github actions", "jenkins"));
    skillKeywords.put("Python", List.of("python"));
    skillKeywords.put("Node.js", List.of("node.js", "nodejs", "node"));
    skillKeywords.put("Next.js", List.of("next.js", "nextjs"));
    skillKeywords.put("Vue", List.of("vue", "vue.js"));
    skillKeywords.put("Linux", List.of("linux"));
    return skillKeywords;
  }
}
