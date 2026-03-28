package com.devpath.api.admin.dto.account;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AccountStatusUpdateRequest {

    @NotBlank
    private String reason;
}