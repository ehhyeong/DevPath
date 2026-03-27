package com.devpath.api.instructor.dto.communication;

import com.devpath.api.instructor.entity.DmRoom;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@Builder
public class DmRoomResponse {

    private Long roomId;
    private Long instructorId;
    private Long learnerId;
    private LocalDateTime createdAt;

    public static DmRoomResponse from(DmRoom dmRoom) {
        return DmRoomResponse.builder()
                .roomId(dmRoom.getId())
                .instructorId(dmRoom.getInstructorId())
                .learnerId(dmRoom.getLearnerId())
                .createdAt(dmRoom.getCreatedAt())
                .build();
    }
}