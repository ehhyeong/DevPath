package com.devpath.api.notification.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.devpath.api.notification.dto.NotificationResponse;
import com.devpath.api.notification.dto.ProjectHeaderNotificationResponse;
import com.devpath.domain.notification.entity.LearnerNotification;
import com.devpath.domain.notification.entity.LearnerNotificationType;
import com.devpath.domain.notification.repository.LearnerNotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WorkspaceInviteNotificationTest {
  @Mock private LearnerNotificationRepository repository;
  @Mock private NotificationSseService sseService;

  @Test
  void persistsAndDeliversJoinPathToHeaderAndRealtimeNotification() {
    when(repository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
    var service = new NotificationEventService(repository, sseService);
    String path = "/workspace-hub?inviteToken=valid-invite";

    NotificationResponse response = service.notifyWorkspaceInvited(2L, "AI 워크스페이스", path);

    var captor = ArgumentCaptor.forClass(LearnerNotification.class);
    verify(repository).save(captor.capture());
    assertThat(captor.getValue().getLearnerId()).isEqualTo(2L);
    assertThat(captor.getValue().getTargetPath()).isEqualTo(path);
    assertThat(response.getTargetPath()).isEqualTo(path);
    assertThat(ProjectHeaderNotificationResponse.from(captor.getValue()).getTargetPath())
        .isEqualTo(path);
    verify(sseService).send(2L, response);
  }

  @Test
  void existingNotificationsKeepTheirOriginalDestination() {
    var notification =
        LearnerNotification.builder()
            .learnerId(2L)
            .type(LearnerNotificationType.SQUAD_INVITED)
            .message("기존 스쿼드 초대")
            .build();
    assertThat(ProjectHeaderNotificationResponse.from(notification).getTargetPath())
        .isEqualTo("/lounge-dashboard");
  }
}
