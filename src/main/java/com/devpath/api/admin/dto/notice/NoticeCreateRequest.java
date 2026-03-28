package com.devpath.api.admin.dto.notice;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NoticeCreateRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String content;

    private Boolean isPinned = false;
}