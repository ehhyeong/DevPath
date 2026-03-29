package com.devpath.api.admin.dto.permission;

import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class InstructorGradeUpdateRequest {

    @NotBlank
    private String grade;
}
