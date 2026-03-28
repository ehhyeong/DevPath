package com.devpath.api.admin.dto.account;

import com.devpath.domain.user.entity.User;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class AccountDetailResponse {

    private Long userId;
    private String email;
    private String nickname;
    private String role;
    private String accountStatus;
    private LocalDateTime createdAt;
    private LocalDateTime lastLoginAt;

    public static AccountDetailResponse from(User user) {
        return AccountDetailResponse.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .nickname(user.getName())
                .role(user.getRole().name())
                .accountStatus(Boolean.TRUE.equals(user.getIsActive()) ? "ACTIVE" : "INACTIVE")
                .createdAt(user.getCreatedAt())
                .lastLoginAt(user.getLastLoginAt())
                .build();
    }
}