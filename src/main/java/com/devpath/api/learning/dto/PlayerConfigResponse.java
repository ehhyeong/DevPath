package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.LessonProgress;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "플레이어 설정 응답 DTO")
public class PlayerConfigResponse {

    @Schema(description = "강의 ID", example = "10")
    private Long lessonId;

    @Schema(description = "기본 재생 속도", example = "1.25")
    private Double defaultPlaybackRate;

    @Schema(description = "PIP 모드 활성화 여부", example = "false")
    private Boolean pipEnabled;

    public static PlayerConfigResponse from(LessonProgress progress) {
        return PlayerConfigResponse.builder()
                .lessonId(progress.getLesson().getLessonId())
                .defaultPlaybackRate(progress.getDefaultPlaybackRate())
                .pipEnabled(progress.getPipEnabled())
                .build();
    }

    public static PlayerConfigResponse defaultForLesson(Long lessonId) {
        // 한글 주석: 저장된 설정이 없어도 조회는 부작용 없이 기본 플레이어 설정만 응답한다.
        return PlayerConfigResponse.builder()
                .lessonId(lessonId)
                .defaultPlaybackRate(1.0D)
                .pipEnabled(false)
                .build();
    }
}
