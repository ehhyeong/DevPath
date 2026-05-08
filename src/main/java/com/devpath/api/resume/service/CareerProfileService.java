package com.devpath.api.resume.service;

import com.devpath.api.resume.dto.CareerProfileRequest;
import com.devpath.api.resume.dto.CareerProfileResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.resume.entity.CareerProfile;
import com.devpath.domain.resume.entity.CareerProfileProject;
import com.devpath.domain.resume.entity.CareerProfileProofCard;
import com.devpath.domain.resume.entity.CareerProfileSkill;
import com.devpath.domain.resume.entity.CareerProfileSnapshot;
import com.devpath.domain.resume.entity.CareerProfileVersion;
import com.devpath.domain.resume.repository.CareerProfileProjectRepository;
import com.devpath.domain.resume.repository.CareerProfileProofCardRepository;
import com.devpath.domain.resume.repository.CareerProfileRepository;
import com.devpath.domain.resume.repository.CareerProfileSkillRepository;
import com.devpath.domain.resume.repository.CareerProfileSnapshotRepository;
import com.devpath.domain.resume.repository.CareerProfileVersionRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CareerProfileService {

  private final CareerProfileRepository careerProfileRepository;
  private final CareerProfileSkillRepository careerProfileSkillRepository;
  private final CareerProfileProofCardRepository careerProfileProofCardRepository;
  private final CareerProfileProjectRepository careerProfileProjectRepository;
  private final CareerProfileSnapshotRepository careerProfileSnapshotRepository;
  private final CareerProfileVersionRepository careerProfileVersionRepository;
  private final UserRepository userRepository;

  @Transactional
  public CareerProfileResponse.Detail createProfile(CareerProfileRequest.Create request) {
    User user = getUser(request.userId());
    validateProfileNotExists(user.getId());

    CareerProfile profile =
        CareerProfile.builder()
            .user(user)
            .targetRole(request.targetRole())
            .headline(request.headline())
            .summary(request.summary())
            .build();

    return buildDetail(careerProfileRepository.save(profile));
  }

  public CareerProfileResponse.Detail getMyProfile(Long userId) {
    CareerProfile profile =
        careerProfileRepository
            .findByUser_IdAndIsDeletedFalse(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESUME_CAREER_PROFILE_NOT_FOUND));

    return buildDetail(profile);
  }

  @Transactional
  public CareerProfileResponse.ProofCardDetail selectProofCard(
      Long profileId, CareerProfileRequest.ProofCardSelect request) {
    CareerProfile profile = getActiveProfile(profileId);
    validateProofCardNotDuplicated(profile.getId(), request.proofCardId());

    CareerProfileProofCard proofCard =
        CareerProfileProofCard.builder()
            .careerProfile(profile)
            .proofCardId(request.proofCardId())
            .title(request.title())
            .summary(request.summary())
            .build();

    return CareerProfileResponse.ProofCardDetail.from(
        careerProfileProofCardRepository.save(proofCard));
  }

  @Transactional
  public void excludeProofCard(Long profileId, Long proofCardId) {
    getActiveProfile(profileId);

    CareerProfileProofCard proofCard =
        careerProfileProofCardRepository
            .findByCareerProfile_IdAndProofCardIdAndIsDeletedFalse(profileId, proofCardId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESUME_PROOF_CARD_NOT_FOUND));

    proofCard.exclude();
  }

  @Transactional
  public CareerProfileResponse.ProjectDetail addProject(
      Long profileId, CareerProfileRequest.ProjectAdd request) {
    CareerProfile profile = getActiveProfile(profileId);

    CareerProfileProject project =
        CareerProfileProject.builder()
            .careerProfile(profile)
            .projectId(request.projectId())
            .title(request.title())
            .role(request.role())
            .description(request.description())
            .skills(request.skills())
            .build();

    return CareerProfileResponse.ProjectDetail.from(careerProfileProjectRepository.save(project));
  }

  @Transactional
  public CareerProfileResponse.SkillDetail addSkill(
      Long profileId, CareerProfileRequest.SkillAdd request) {
    CareerProfile profile = getActiveProfile(profileId);
    validateSkillNotDuplicated(profile.getId(), request.name());

    CareerProfileSkill skill =
        CareerProfileSkill.builder()
            .careerProfile(profile)
            .name(request.name())
            .level(request.level())
            .selfReported(true)
            .build();

    return CareerProfileResponse.SkillDetail.from(careerProfileSkillRepository.save(skill));
  }

  @Transactional
  public CareerProfileResponse.SnapshotDetail createSnapshot(
      Long profileId, CareerProfileRequest.SnapshotCreate request) {
    CareerProfile profile = getActiveProfile(profileId);
    String snapshotContent = buildSnapshotContent(profile);
    int nextVersionNumber =
        Math.toIntExact(
            careerProfileVersionRepository.countByCareerProfile_Id(profile.getId()) + 1);

    CareerProfileSnapshot snapshot =
        CareerProfileSnapshot.builder()
            .careerProfile(profile)
            .snapshotContent(snapshotContent)
            .memo(request.memo())
            .build();
    CareerProfileSnapshot savedSnapshot = careerProfileSnapshotRepository.save(snapshot);

    CareerProfileVersion version =
        CareerProfileVersion.builder()
            .careerProfile(profile)
            .snapshot(savedSnapshot)
            .versionNumber(nextVersionNumber)
            .description(request.memo())
            .versionContent(snapshotContent)
            .build();
    CareerProfileVersion savedVersion = careerProfileVersionRepository.save(version);

    return CareerProfileResponse.SnapshotDetail.from(savedSnapshot, savedVersion);
  }

  public List<CareerProfileResponse.VersionDetail> getVersions(Long profileId) {
    getActiveProfile(profileId);

    return careerProfileVersionRepository
        .findAllByCareerProfile_IdOrderByVersionNumberDesc(profileId)
        .stream()
        .map(CareerProfileResponse.VersionDetail::from)
        .toList();
  }

  private CareerProfileResponse.Detail buildDetail(CareerProfile profile) {
    List<CareerProfileSkill> skills =
        careerProfileSkillRepository.findAllByCareerProfile_IdAndIsDeletedFalseOrderByNameAsc(
            profile.getId());
    List<CareerProfileProofCard> proofCards =
        careerProfileProofCardRepository
            .findAllByCareerProfile_IdAndIsDeletedFalseOrderByCreatedAtDesc(profile.getId());
    List<CareerProfileProject> projects =
        careerProfileProjectRepository
            .findAllByCareerProfile_IdAndIsDeletedFalseOrderByCreatedAtDesc(profile.getId());

    return CareerProfileResponse.Detail.from(profile, skills, proofCards, projects);
  }

  private CareerProfile getActiveProfile(Long profileId) {
    return careerProfileRepository
        .findByIdAndIsDeletedFalse(profileId)
        .orElseThrow(() -> new CustomException(ErrorCode.RESUME_CAREER_PROFILE_NOT_FOUND));
  }

  private User getUser(Long userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
  }

  private void validateProfileNotExists(Long userId) {
    if (careerProfileRepository.existsByUser_IdAndIsDeletedFalse(userId)) {
      throw new CustomException(ErrorCode.RESUME_CAREER_PROFILE_ALREADY_EXISTS);
    }
  }

  private void validateSkillNotDuplicated(Long profileId, String skillName) {
    if (careerProfileSkillRepository.existsByCareerProfile_IdAndNameIgnoreCaseAndIsDeletedFalse(
        profileId, skillName)) {
      throw new CustomException(ErrorCode.RESUME_SKILL_ALREADY_EXISTS);
    }
  }

  private void validateProofCardNotDuplicated(Long profileId, Long proofCardId) {
    if (careerProfileProofCardRepository.existsByCareerProfile_IdAndProofCardIdAndIsDeletedFalse(
        profileId, proofCardId)) {
      throw new CustomException(ErrorCode.RESUME_PROOF_CARD_ALREADY_EXISTS);
    }
  }

  private String buildSnapshotContent(CareerProfile profile) {
    List<CareerProfileSkill> skills =
        careerProfileSkillRepository.findAllByCareerProfile_IdAndIsDeletedFalseOrderByNameAsc(
            profile.getId());
    List<CareerProfileProofCard> proofCards =
        careerProfileProofCardRepository
            .findAllByCareerProfile_IdAndIsDeletedFalseOrderByCreatedAtDesc(profile.getId());
    List<CareerProfileProject> projects =
        careerProfileProjectRepository
            .findAllByCareerProfile_IdAndIsDeletedFalseOrderByCreatedAtDesc(profile.getId());

    StringBuilder builder = new StringBuilder();
    builder.append("targetRole: ").append(profile.getTargetRole()).append('\n');
    builder.append("headline: ").append(profile.getHeadline()).append('\n');
    builder.append("summary: ").append(nullToEmpty(profile.getSummary())).append('\n');

    builder.append("skills: ");
    builder.append(
        skills.stream()
            .map(skill -> skill.getName() + "(" + nullToEmpty(skill.getLevel()) + ")")
            .reduce((left, right) -> left + ", " + right)
            .orElse("none"));
    builder.append('\n');

    builder.append("proofCards: ");
    builder.append(
        proofCards.stream()
            .map(proofCard -> proofCard.getTitle() + "#" + proofCard.getProofCardId())
            .reduce((left, right) -> left + ", " + right)
            .orElse("none"));
    builder.append('\n');

    builder.append("projects: ");
    builder.append(
        projects.stream()
            .map(project -> project.getTitle() + "(" + project.getRole() + ")")
            .reduce((left, right) -> left + ", " + right)
            .orElse("none"));

    return builder.toString();
  }

  private String nullToEmpty(String value) {
    return value == null ? "" : value;
  }
}
