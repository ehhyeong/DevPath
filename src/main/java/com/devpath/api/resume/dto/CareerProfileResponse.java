package com.devpath.api.resume.dto;

import com.devpath.domain.resume.entity.CareerProfile;
import com.devpath.domain.resume.entity.CareerProfileProject;
import com.devpath.domain.resume.entity.CareerProfileProofCard;
import com.devpath.domain.resume.entity.CareerProfileSkill;
import com.devpath.domain.resume.entity.CareerProfileSnapshot;
import com.devpath.domain.resume.entity.CareerProfileVersion;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

public class CareerProfileResponse {

  private CareerProfileResponse() {}

  @Schema(name = "CareerProfileDetailResponse", description = "채용 분석용 프로필 상세 응답")
  public record Detail(
      @Schema(description = "프로필 ID", example = "1") Long profileId,
      @Schema(description = "사용자 ID", example = "2") Long userId,
      @Schema(description = "사용자 이름", example = "이학습") String userName,
      @Schema(description = "목표 직무", example = "Backend Developer") String targetRole,
      @Schema(description = "프로필 헤드라인", example = "문제 해결 중심의 백엔드 개발자") String headline,
      @Schema(description = "프로필 요약", example = "Spring Boot 기반 API 설계와 JPA 데이터 모델링에 강점이 있습니다.")
          String summary,
      @Schema(description = "스킬 목록", example = "[{\"skillId\":1,\"name\":\"Spring Boot\"}]")
          List<SkillDetail> skills,
      @Schema(
              description = "선택한 Proof Card 목록",
              example = "[{\"proofCardId\":1,\"title\":\"Spring Boot 미션 통과\"}]")
          List<ProofCardDetail> proofCards,
      @Schema(
              description = "선택한 프로젝트 경험 목록",
              example = "[{\"projectProfileId\":1,\"title\":\"DevPath\"}]")
          List<ProjectDetail> projects,
      @Schema(description = "생성일시", example = "2026-05-06T15:00:00") LocalDateTime createdAt,
      @Schema(description = "수정일시", example = "2026-05-06T15:10:00") LocalDateTime updatedAt) {

    public static Detail from(
        CareerProfile profile,
        List<CareerProfileSkill> skills,
        List<CareerProfileProofCard> proofCards,
        List<CareerProfileProject> projects) {
      return new Detail(
          profile.getId(),
          profile.getUser().getId(),
          profile.getUser().getName(),
          profile.getTargetRole(),
          profile.getHeadline(),
          profile.getSummary(),
          skills.stream().map(SkillDetail::from).toList(),
          proofCards.stream().map(ProofCardDetail::from).toList(),
          projects.stream().map(ProjectDetail::from).toList(),
          profile.getCreatedAt(),
          profile.getUpdatedAt());
    }
  }

  @Schema(name = "CareerProfileSkillResponse", description = "프로필 스킬 응답")
  public record SkillDetail(
      @Schema(description = "스킬 ID", example = "1") Long skillId,
      @Schema(description = "스킬명", example = "Spring Boot") String name,
      @Schema(description = "숙련도", example = "INTERMEDIATE") String level,
      @Schema(description = "직접 입력 여부", example = "true") Boolean selfReported) {

    public static SkillDetail from(CareerProfileSkill skill) {
      return new SkillDetail(
          skill.getId(), skill.getName(), skill.getLevel(), skill.getSelfReported());
    }
  }

  @Schema(name = "CareerProfileProofCardResponse", description = "프로필 Proof Card 응답")
  public record ProofCardDetail(
      @Schema(description = "프로필 Proof Card 매핑 ID", example = "1") Long id,
      @Schema(description = "Proof Card ID", example = "1") Long proofCardId,
      @Schema(description = "Proof Card 제목", example = "Spring Boot 미션 통과") String title,
      @Schema(description = "Proof Card 요약", example = "JWT 인증 API와 예외 처리 구조를 구현하고 리뷰를 통과했습니다.")
          String summary) {

    public static ProofCardDetail from(CareerProfileProofCard proofCard) {
      return new ProofCardDetail(
          proofCard.getId(),
          proofCard.getProofCardId(),
          proofCard.getTitle(),
          proofCard.getSummary());
    }
  }

  @Schema(name = "CareerProfileProjectResponse", description = "프로필 프로젝트 경험 응답")
  public record ProjectDetail(
      @Schema(description = "프로필 프로젝트 ID", example = "1") Long projectProfileId,
      @Schema(description = "프로젝트 ID", example = "1") Long projectId,
      @Schema(description = "프로젝트명", example = "DevPath") String title,
      @Schema(description = "역할", example = "Backend Developer") String role,
      @Schema(description = "프로젝트 설명", example = "멘토링, PR 리뷰, 채용 공고 분석 API를 구현했습니다.")
          String description,
      @Schema(description = "사용 기술", example = "Java, Spring Boot, JPA") String skills) {

    public static ProjectDetail from(CareerProfileProject project) {
      return new ProjectDetail(
          project.getId(),
          project.getProjectId(),
          project.getTitle(),
          project.getRole(),
          project.getDescription(),
          project.getSkills());
    }
  }

  @Schema(name = "CareerProfileSnapshotResponse", description = "프로필 스냅샷 응답")
  public record SnapshotDetail(
      @Schema(description = "스냅샷 ID", example = "1") Long snapshotId,
      @Schema(description = "프로필 ID", example = "1") Long profileId,
      @Schema(description = "스냅샷 내용", example = "targetRole: Backend Developer")
          String snapshotContent,
      @Schema(description = "스냅샷 메모", example = "백엔드 주니어 지원용 프로필 스냅샷") String memo,
      @Schema(description = "생성된 버전 번호", example = "1") Integer versionNumber,
      @Schema(description = "생성일시", example = "2026-05-06T15:30:00") LocalDateTime createdAt) {

    public static SnapshotDetail from(
        CareerProfileSnapshot snapshot, CareerProfileVersion version) {
      return new SnapshotDetail(
          snapshot.getId(),
          snapshot.getCareerProfile().getId(),
          snapshot.getSnapshotContent(),
          snapshot.getMemo(),
          version.getVersionNumber(),
          snapshot.getCreatedAt());
    }
  }

  @Schema(name = "CareerProfileVersionResponse", description = "프로필 버전 응답")
  public record VersionDetail(
      @Schema(description = "버전 ID", example = "1") Long versionId,
      @Schema(description = "프로필 ID", example = "1") Long profileId,
      @Schema(description = "스냅샷 ID", example = "1") Long snapshotId,
      @Schema(description = "버전 번호", example = "1") Integer versionNumber,
      @Schema(description = "버전 설명", example = "백엔드 주니어 지원용 프로필 스냅샷") String description,
      @Schema(description = "버전 내용", example = "targetRole: Backend Developer")
          String versionContent,
      @Schema(description = "생성일시", example = "2026-05-06T15:30:00") LocalDateTime createdAt) {

    public static VersionDetail from(CareerProfileVersion version) {
      return new VersionDetail(
          version.getId(),
          version.getCareerProfile().getId(),
          version.getSnapshot().getId(),
          version.getVersionNumber(),
          version.getDescription(),
          version.getVersionContent(),
          version.getCreatedAt());
    }
  }
}
