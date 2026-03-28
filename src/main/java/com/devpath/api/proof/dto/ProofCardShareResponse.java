package com.devpath.api.proof.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

// Proof Card Share 응답 DTO 모음
public class ProofCardShareResponse {

    // 공유 링크 응답 DTO
    @Getter
    @Builder
    @Schema(description = "공유 링크 응답 DTO")
    public static class Detail {

        // 공유 링크 ID
        @Schema(description = "공유 링크 ID", example = "1")
        private Long shareId;

        // Proof Card ID
        @Schema(description = "Proof Card ID", example = "1")
        private Long proofCardId;

        // 공유 토큰
        @Schema(description = "공유 토큰", example = "proof-share-token-123")
        private String shareToken;

        // 공유 URL
        @Schema(description = "공유 URL", example = "/api/proof-card-shares/proof-share-token-123")
        private String shareUrl;

        // 링크 상태
        @Schema(description = "링크 상태", example = "ACTIVE")
        private String status;

        // 만료 시각
        @Schema(description = "만료 시각", example = "2026-04-27T23:59:59")
        private LocalDateTime expiresAt;

        // 조회 수
        @Schema(description = "조회 수", example = "12")
        private Long accessCount;
    }

    // 공개 공유 상세 응답 DTO
    @Getter
    @Builder
    @Schema(description = "공개 공유 상세 응답 DTO")
    public static class PublicDetail {

        // 공유 토큰
        @Schema(description = "공유 토큰", example = "proof-share-token-123")
        private String shareToken;

        // 카드 제목
        @Schema(description = "카드 제목", example = "Spring Security JWT 인증 Proof Card")
        private String title;

        // 로드맵 노드 제목
        @Schema(description = "로드맵 노드 제목", example = "Spring Security JWT 인증")
        private String nodeTitle;

        // 링크 상태
        @Schema(description = "링크 상태", example = "ACTIVE")
        private String status;

        // 조회 수
        @Schema(description = "조회 수", example = "12")
        private Long accessCount;

        // 발급 시각
        @Schema(description = "발급 시각", example = "2026-03-27T14:30:00")
        private LocalDateTime issuedAt;

        // 카드 태그 목록
        @Schema(description = "카드 태그 목록")
        private List<ProofCardResponse.TagItem> tags;
    }
}
