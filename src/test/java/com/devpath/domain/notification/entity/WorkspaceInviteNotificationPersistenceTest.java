package com.devpath.domain.notification.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.devpath.domain.notification.repository.LearnerNotificationRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class WorkspaceInviteNotificationPersistenceTest {
  @Autowired private LearnerNotificationRepository repository;
  @Autowired private EntityManager entityManager;

  @Test
  void reloadsInviteDestinationFromDatabase() {
    String path = "/workspace-hub?inviteToken=42.persisted-signed-token";
    var notification =
        LearnerNotification.builder()
            .learnerId(2L)
            .type(LearnerNotificationType.SQUAD_INVITED)
            .message("워크스페이스 초대")
            .targetPath(path)
            .build();
    Long id = repository.saveAndFlush(notification).getId();
    entityManager.clear();

    var reloaded = repository.findById(id).orElseThrow();
    assertThat(reloaded.getTargetPath()).isEqualTo(path);
    assertThat(reloaded.getCreatedAt()).isNotNull();
  }
}
