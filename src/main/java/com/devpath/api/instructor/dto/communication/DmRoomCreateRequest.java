package com.devpath.api.instructor.dto.communication;

import jakarta.validation.constraints.NotNull;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DmRoomCreateRequest {

    @NotNull
    private Long learnerId;
}