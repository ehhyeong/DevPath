package com.devpath.domain.workspace.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.devpath.domain.workspace.repository.TeamWorkspaceHeaderNotificationRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class TeamWorkspaceHeaderNotificationAuditingTest {

  @Autowired private TeamWorkspaceHeaderNotificationRepository notificationRepository;

  @Test
  void savePopulatesAuditTimestamps() {
    TeamWorkspaceHeaderNotification notification =
        TeamWorkspaceHeaderNotification.builder()
            .workspaceId(1L)
            .pageKey("kanban")
            .message("message")
            .timeLabel("now")
            .targetPath("/team-ws-kanban")
            .displayOrder(0)
            .build();

    TeamWorkspaceHeaderNotification saved = notificationRepository.saveAndFlush(notification);

    assertThat(saved.getCreatedAt()).isNotNull();
    assertThat(saved.getUpdatedAt()).isNotNull();
  }
}
