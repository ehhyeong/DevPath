package com.devpath.api.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;
import java.util.List;

@Schema(description = "유저 프로필 및 초기 기술 스택 설정 요청 DTO")
public record UserProfileSetupRequest(

        @Schema(description = "자기소개", example = "안녕하세요! 3년차 백엔드 개발자를 꿈꾸는 학생입니다.")
        @Size(max = 500, message = "자기소개는 500자를 초과할 수 없습니다.")
        String bio,

        @Schema(description = "전화번호", example = "010-1234-5678")
        String phone,

        @Schema(description = "보유 기술 태그 ID 목록 (기존 지식 인정용)", example = "[1, 5, 12]")
        List<Long> tagIds
) {
}