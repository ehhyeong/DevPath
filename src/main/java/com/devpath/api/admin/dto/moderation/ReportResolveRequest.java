package com.devpath.api.admin.dto.moderation;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ReportResolveRequest {

    @NotBlank
    private String reason;

    @NotBlank
    private String action;
}