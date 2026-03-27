package com.devpath.api.instructor.dto.marketing;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PromotionStatusUpdateRequest {

    @NotNull
    private Boolean isActive;
}