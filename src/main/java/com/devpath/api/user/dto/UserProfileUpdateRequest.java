package com.devpath.api.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

@Schema(description = "User profile update request DTO")
public record UserProfileUpdateRequest(
    @Schema(description = "Display name", example = "Kim Dev")
        @NotBlank(message = "Display name is required.")
        @Size(max = 100, message = "Display name must be 100 characters or fewer.")
        String name,
    @Schema(description = "Bio", example = "Backend learner focused on Spring.")
        @Size(max = 500, message = "Bio must be 500 characters or fewer.")
        String bio,
    @Schema(description = "Phone number", example = "010-1234-5678")
        @Size(max = 20, message = "Phone number must be 20 characters or fewer.")
        String phone,
    @Schema(description = "Profile image URL") @Size(max = 500) String profileImage,
    @Schema(description = "Channel or nickname", example = "CozyCoder") @Size(max = 120)
        String channelName,
    @Schema(description = "GitHub URL") @Size(max = 500) String githubUrl,
    @Schema(description = "Blog URL") @Size(max = 500) String blogUrl,
    @Schema(description = "Selected tech tag ids", example = "[1, 5, 12]") List<Long> tagIds) {}
