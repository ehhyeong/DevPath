package com.devpath.api.instructor.dto.communication;

import com.devpath.api.instructor.entity.DmRoom;
import java.time.LocalDateTime;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class DmRoomResponse {

  private Long roomId;
  private Long instructorId;
  private Long learnerId;
  private LocalDateTime createdAt;
  private int messageCount;
  private LocalDateTime lastMessageAt;
  private List<DmMessageResponse> messages;

  // DM 방 조회에서는 메타데이터와 메시지 목록을 함께 내려준다.
  public static DmRoomResponse from(
      DmRoom dmRoom, List<DmMessageResponse> messages, LocalDateTime lastMessageAt) {
    return DmRoomResponse.builder()
        .roomId(dmRoom.getId())
        .instructorId(dmRoom.getInstructorId())
        .learnerId(dmRoom.getLearnerId())
        .createdAt(dmRoom.getCreatedAt())
        .messageCount(messages.size())
        .lastMessageAt(lastMessageAt)
        .messages(messages)
        .build();
  }
}
