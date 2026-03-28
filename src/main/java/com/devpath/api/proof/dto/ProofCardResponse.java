package com.devpath.api.proof.dto;

import com.devpath.domain.learning.entity.proof.SkillEvidenceType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

// Proof Card 응답 DTO 모음
public class ProofCardResponse {

    // Proof Card 태그 응답 DTO
    @Getter
    @Builder
    @Schema(description = "Proof Card 태그 응답 DTO")
    public static class TagItem {

        // 태그 ID
        @Schema(description = "태그 ID", example = "3")
        private Long tagId;

        // 태그 이름
        @Schema(description = "태그 이름", example = "Spring Security")
        private String tagName;

        // 태그 증빙 유형
        @Schema(description = "태그 증빙 유형", example = "VERIFIED")
        private SkillEvidenceType evidenceType;
    }

    // Proof Card 목록 응답 DTO
    @Getter
    @Builder
    @Schema(description = "Proof Card 목록 응답 DTO")
    public static class Summary {

        // Proof Card ID
        @Schema(description = "Proof Card ID", example = "1")
        private Long proofCardId;

        // 로드맵 노드 ID
        @Schema(description = "로드맵 노드 ID", example = "10")
        private Long nodeId;

        // 로드맵 노드 제목
        @Schema(description = "로드맵 노드 제목", example = "Spring Security JWT 인증")
        private String nodeTitle;

        // 카드 제목
        @Schema(description = "카드 제목", example = "Spring Security JWT 인증 Proof Card")
        private String title;

        // 카드 상태
        @Schema(description = "카드 상태", example = "ISSUED")
        private String status;

        // 발급 시각
        @Schema(description = "발급 시각", example = "2026-03-27T14:30:00")
        private LocalDateTime issuedAt;
    }

    // Proof Card 상세 응답 DTO
    @Getter
    @Builder
    @Schema(description = "Proof Card 상세 응답 DTO")
    public static class Detail {

        // Proof Card ID
        @Schema(description = "Proof Card ID", example = "1")
        private Long proofCardId;

        // 로드맵 노드 ID
        @Schema(description = "로드맵 노드 ID", example = "10")
        private Long nodeId;

        // 로드맵 노드 제목
        @Schema(description = "로드맵 노드 제목", example = "Spring Security JWT 인증")
        private String nodeTitle;

        // 카드 제목
        @Schema(description = "카드 제목", example = "Spring Security JWT 인증 Proof Card")
        private String title;

        // 카드 설명
        @Schema(description = "카드 설명", example = "Spring Security JWT 인증 노드의 학습 완료 및 검증 조건 충족 결과를 증명합니다.")
        private String description;

        // 카드 상태
        @Schema(description = "카드 상태", example = "ISSUED")
        private String status;

        // 발급 시각
        @Schema(description = "발급 시각", example = "2026-03-27T14:30:00")
        private LocalDateTime issuedAt;

        // 카드 태그 목록
        @Schema(description = "카드 태그 목록")
        private List<TagItem> tags;
    }

    // Proof Card 갤러리 응답 DTO
    @Getter
    @Builder
    @Schema(description = "Proof Card 갤러리 응답 DTO")
    public static class GalleryItem {

        // Proof Card ID
        @Schema(description = "Proof Card ID", example = "1")
        private Long proofCardId;

        // 카드 제목
        @Schema(description = "카드 제목", example = "Spring Security JWT 인증 Proof Card")
        private String title;

        // 로드맵 노드 제목
        @Schema(description = "로드맵 노드 제목", example = "Spring Security JWT 인증")
        private String nodeTitle;

        // 발급 시각
        @Schema(description = "발급 시각", example = "2026-03-27T14:30:00")
        private LocalDateTime issuedAt;

        // 카드 태그 목록
        @Schema(description = "카드 태그 목록")
        private List<TagItem> tags;
    }
}
