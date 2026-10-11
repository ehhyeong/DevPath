package com.devpath.domain.workspace.entity;

import static org.assertj.core.api.Assertions.assertThat;

import com.devpath.domain.workspace.repository.WorkspaceTaskRepository;
import jakarta.persistence.EntityManager;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class WorkspaceTaskFeaturePersistenceTest {
  @Autowired WorkspaceTaskRepository tasks;
  @Autowired EntityManager entityManager;

  @Test
  void linksSurviveReloadStatusChangesAndClearAndDeletedTasksLeaveTheCount() {
    var task = WorkspaceTask.builder().workspaceId(94001L).title("로그인").createdById(77L).build();
    task.changeFeatureIds(List.of("F1", "F2"));
    Long id = tasks.saveAndFlush(task).getId();
    entityManager.clear();
    var loaded = tasks.findByIdAndIsDeletedFalse(id).orElseThrow();
    assertThat(loaded.getFeatureIds()).containsExactly("F1", "F2");
    loaded.changeStatus(WorkspaceTaskStatus.DONE);
    entityManager.flush();
    entityManager.clear();
    loaded = tasks.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(94001L).getFirst();
    assertThat(loaded.getFeatureIds()).containsExactly("F1", "F2");
    assertThat(loaded.getStatus()).isEqualTo(WorkspaceTaskStatus.DONE);
    loaded.changeFeatureIds(List.of());
    entityManager.flush();
    entityManager.clear();
    loaded = tasks.findByIdAndIsDeletedFalse(id).orElseThrow();
    assertThat(loaded.getFeatureIds()).isEmpty();
    loaded.delete();
    entityManager.flush();
    entityManager.clear();
    assertThat(tasks.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(94001L)).isEmpty();
  }
}
