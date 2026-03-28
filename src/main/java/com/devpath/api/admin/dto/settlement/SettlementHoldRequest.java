package com.devpath.api.admin.dto.settlement;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SettlementHoldRequest {

    @NotBlank
    private String reason;
}