package com.devpath.api.market.service;

import com.devpath.api.market.dto.LearningFeedbackRequest;
import com.devpath.api.market.dto.LearningFeedbackResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.job.repository.JobSkillTagRepository;
import com.devpath.domain.market.model.LearningNextStep;
import com.devpath.domain.market.model.LearningSkillGap;
import com.devpath.domain.market.model.RelatedLearningResource;
import com.devpath.domain.resume.entity.CareerProfile;
import com.devpath.domain.resume.entity.CareerProfileSkill;
import com.devpath.domain.resume.repository.CareerProfileRepository;
import com.devpath.domain.resume.repository.CareerProfileSkillRepository;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearningFeedbackService {

  private static final int DEFAULT_RECOMMEND_LIMIT = 5;

  private final CareerProfileRepository careerProfileRepository;
  private final CareerProfileSkillRepository careerProfileSkillRepository;
  private final JobSkillTagRepository jobSkillTagRepository;

  public LearningFeedbackResponse.RefreshResult refreshLearningData(
      Long userId, LearningFeedbackRequest.Refresh request) {
    CareerProfile profile = getOwnedActiveProfile(userId, request.profileId());
    List<CareerProfileSkill> ownedSkills = getOwnedSkills(profile.getId());
    List<JobSkillTagRepository.PopularSkillTagProjection> marketSkills =
        jobSkillTagRepository.findPopularSkillTags();
    List<LearningSkillGap> skillGaps = calculateSkillGaps(profile.getId(), marketSkills);

    return new LearningFeedbackResponse.RefreshResult(
        profile.getId(),
        ownedSkills.size(),
        marketSkills.size(),
        skillGaps.size(),
        "학습 데이터 재추출이 완료되었습니다.",
        LocalDateTime.now(),
        skillGaps.stream().map(LearningFeedbackResponse.SkillGapDetail::from).toList());
  }

  public LearningFeedbackResponse.NextSteps getNextSteps(Long userId, Long profileId) {
    CareerProfile profile = getOwnedActiveProfile(userId, profileId);
    List<LearningSkillGap> skillGaps = calculateSkillGaps(profile.getId());

    List<LearningNextStep> nextSteps =
        skillGaps.stream().limit(DEFAULT_RECOMMEND_LIMIT).map(this::toNextStep).toList();

    return new LearningFeedbackResponse.NextSteps(
        profile.getId(),
        skillGaps.stream().map(LearningFeedbackResponse.SkillGapDetail::from).toList(),
        nextSteps.stream().map(LearningFeedbackResponse.NextStepDetail::from).toList());
  }

  public LearningFeedbackResponse.RelatedRoadmaps getRelatedRoadmaps(
      Long userId, LearningFeedbackRequest.RelatedRoadmaps request) {
    CareerProfile profile = getOwnedActiveProfile(userId, request.profileId());

    List<RelatedLearningResource> roadmaps =
        calculateSkillGaps(profile.getId()).stream()
            .filter(gap -> matchesTargetSkill(gap.skillName(), request.targetSkill()))
            .limit(DEFAULT_RECOMMEND_LIMIT)
            .map(
                gap ->
                    new RelatedLearningResource(
                        "ROADMAP",
                        gap.skillName(),
                        gap.skillName() + " 실무 입문 로드맵",
                        gap.skillName() + " 학습 노드를 추가해 시장 수요가 높은 부족 기술을 보완합니다.",
                        gap.priorityScore()))
            .toList();

    return new LearningFeedbackResponse.RelatedRoadmaps(
        profile.getId(),
        roadmaps.stream().map(LearningFeedbackResponse.RelatedResourceDetail::from).toList());
  }

  public LearningFeedbackResponse.AddToRoadmapResult addToRoadmap(
      Long userId, LearningFeedbackRequest.AddToRoadmap request) {
    CareerProfile profile = getOwnedActiveProfile(userId, request.profileId());
    List<LearningSkillGap> skillGaps = calculateSkillGaps(profile.getId());

    boolean skillGapExists =
        skillGaps.stream().anyMatch(gap -> equalsIgnoreCase(gap.skillName(), request.skillName()));

    if (!skillGapExists) {
      throw new CustomException(ErrorCode.MARKET_LEARNING_FEEDBACK_SKILL_GAP_NOT_FOUND);
    }

    return new LearningFeedbackResponse.AddToRoadmapResult(
        profile.getId(),
        request.roadmapId(),
        request.skillName(),
        "READY_TO_ADD",
        "로드맵 도메인 연동 전 단계로 추가 후보가 생성되었습니다.");
  }

  public LearningFeedbackResponse.RecommendedCourses getRecommendedCourses(
      Long userId, LearningFeedbackRequest.Courses request) {
    CareerProfile profile = getOwnedActiveProfile(userId, request.profileId());

    List<RelatedLearningResource> courses =
        calculateSkillGaps(profile.getId()).stream()
            .filter(gap -> matchesTargetSkill(gap.skillName(), request.targetSkill()))
            .limit(DEFAULT_RECOMMEND_LIMIT)
            .map(
                gap ->
                    new RelatedLearningResource(
                        "COURSE",
                        gap.skillName(),
                        gap.skillName() + " 핵심 개념과 실습 강의",
                        gap.skillName() + " 기본 개념, 실무 적용, 미니 프로젝트를 순서대로 학습합니다.",
                        gap.priorityScore()))
            .toList();

    return new LearningFeedbackResponse.RecommendedCourses(
        profile.getId(),
        courses.stream().map(LearningFeedbackResponse.RelatedResourceDetail::from).toList());
  }

  private List<LearningSkillGap> calculateSkillGaps(Long profileId) {
    return calculateSkillGaps(profileId, jobSkillTagRepository.findPopularSkillTags());
  }

  private List<LearningSkillGap> calculateSkillGaps(
      Long profileId, List<JobSkillTagRepository.PopularSkillTagProjection> marketSkills) {
    Set<String> ownedSkillNames =
        getOwnedSkills(profileId).stream()
            .map(CareerProfileSkill::getName)
            .map(this::normalize)
            .collect(Collectors.toSet());

    return marketSkills.stream()
        .filter(projection -> !ownedSkillNames.contains(normalize(projection.getTagName())))
        .map(projection -> toSkillGap(projection.getTagName(), projection.getUsageCount()))
        .sorted(
            Comparator.comparing(LearningSkillGap::priorityScore)
                .reversed()
                .thenComparing(LearningSkillGap::skillName))
        .toList();
  }

  private LearningSkillGap toSkillGap(String skillName, Long marketDemandCount) {
    int priorityScore = Math.toIntExact(Math.min(marketDemandCount * 10, 1000));

    return new LearningSkillGap(
        skillName,
        marketDemandCount,
        false,
        priorityScore,
        "시장 공고에서 자주 등장하지만 내 CareerProfile에는 없는 기술입니다.");
  }

  private LearningNextStep toNextStep(LearningSkillGap gap) {
    return new LearningNextStep(
        gap.skillName(),
        1,
        gap.skillName() + " 학습 시작하기",
        gap.skillName() + "는 현재 채용 공고에서 수요가 높은 기술입니다. 기본 개념부터 프로젝트 적용까지 순서대로 학습하는 것이 좋습니다.",
        "관련 로드맵에 " + gap.skillName() + " 노드를 추가하세요.");
  }

  private CareerProfile getActiveProfile(Long profileId) {
    return careerProfileRepository
        .findByIdAndIsDeletedFalse(profileId)
        .orElseThrow(() -> new CustomException(ErrorCode.RESUME_CAREER_PROFILE_NOT_FOUND));
  }

  private CareerProfile getOwnedActiveProfile(Long userId, Long profileId) {
    CareerProfile profile = getActiveProfile(profileId);
    if (!profile.getUser().getId().equals(userId)) {
      throw new CustomException(ErrorCode.FORBIDDEN);
    }
    return profile;
  }

  private List<CareerProfileSkill> getOwnedSkills(Long profileId) {
    return careerProfileSkillRepository.findAllByCareerProfile_IdAndIsDeletedFalseOrderByNameAsc(
        profileId);
  }

  private boolean matchesTargetSkill(String sourceSkill, String targetSkill) {
    if (targetSkill == null || targetSkill.trim().isEmpty()) {
      return true;
    }

    return equalsIgnoreCase(sourceSkill, targetSkill);
  }

  private boolean equalsIgnoreCase(String source, String target) {
    if (source == null || target == null) {
      return false;
    }

    return normalize(source).equals(normalize(target));
  }

  private String normalize(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
  }
}
