package com.devpath.api.learning.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class TimestampNoteRequest {

    @Getter
    @NoArgsConstructor
    public static class Create {

        @NotNull(message = "타임스탬프(초)는 필수입니다.")
        @Min(value = 0, message = "타임스탬프는 0 이상이어야 합니다.")
        private Integer timestampSecond;

        @NotBlank(message = "노트 내용은 필수입니다.")
        private String content;
    }

    @Getter
    @NoArgsConstructor
    public static class Update {

        @NotNull(message = "타임스탬프(초)는 필수입니다.")
        @Min(value = 0, message = "타임스탬프는 0 이상이어야 합니다.")
        private Integer timestampSecond;

        @NotBlank(message = "노트 내용은 필수입니다.")
        private String content;
    }
}
