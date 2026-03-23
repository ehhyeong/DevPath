package com.devpath.api.learning.dto;

import com.devpath.domain.learning.entity.LessonProgress;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "강의 진도율 응답 DTO")
public class LessonProgressResponse {

    @Schema(description = "강의 ID", example = "10")
    private Long lessonId;

    @Schema(description = "진도율(%)", example = "42")
    private Integer progressPercent;

    @Schema(description = "현재 재생 위치(초)", example = "315")
    private Integer progressSeconds;

    @Schema(description = "기본 재생 속도", example = "1.25")
    private Double defaultPlaybackRate;

    @Schema(description = "PIP 모드 활성화 여부", example = "false")
    private Boolean pipEnabled;

    @Schema(description = "학습 완료 여부", example = "false")
    private Boolean isCompleted;

    @Schema(description = "마지막 학습 시각", example = "2026-03-23T13:40:00")
    private LocalDateTime lastWatchedAt;

    public static LessonProgressResponse from(LessonProgress progress) {
        return LessonProgressResponse.builder()
                .lessonId(progress.getLesson().getLessonId())
                .progressPercent(progress.getProgressPercent())
                .progressSeconds(progress.getProgressSeconds())
                .defaultPlaybackRate(progress.getDefaultPlaybackRate())
                .pipEnabled(progress.getPipEnabled())
                .isCompleted(progress.getIsCompleted())
                .lastWatchedAt(progress.getLastWatchedAt())
                .build();
    }

    public static LessonProgressResponse defaultForLesson(Long lessonId) {
        // 한글 주석: GET 조회에서 row를 만들지 않고도 프론트가 바로 쓸 기본값을 내려준다.
        return LessonProgressResponse.builder()
                .lessonId(lessonId)
                .progressPercent(0)
                .progressSeconds(0)
                .defaultPlaybackRate(1.0D)
                .pipEnabled(false)
                .isCompleted(false)
                .lastWatchedAt(null)
                .build();
    }
}
