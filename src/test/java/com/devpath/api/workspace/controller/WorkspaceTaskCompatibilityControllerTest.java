package com.devpath.api.workspace.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.devpath.api.workspace.dto.UpdateTaskAssigneeRequest;
import com.devpath.api.workspace.dto.UpdateTaskRequest;
import com.devpath.api.workspace.dto.UpdateTaskStatusRequest;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;

class WorkspaceTaskCompatibilityControllerTest {

  @Test
  void exposesExistingTaskCompatibilityUrls() throws NoSuchMethodException {
    RequestMapping root =
        WorkspaceTaskCompatibilityController.class.getAnnotation(RequestMapping.class);
    assertThat(root.value()).containsExactly("/api/tasks");

    assertPatchMapping("updateTask", "/{taskId}", Long.class, UpdateTaskRequest.class, Long.class);
    assertPatchMapping(
        "updateTaskAssignee",
        "/{taskId}/assignee",
        Long.class,
        UpdateTaskAssigneeRequest.class,
        Long.class);
    assertPatchMapping(
        "updateTaskStatus",
        "/{taskId}/status",
        Long.class,
        UpdateTaskStatusRequest.class,
        Long.class);

    Method deleteTask =
        WorkspaceTaskCompatibilityController.class.getDeclaredMethod(
            "deleteTask", Long.class, Long.class);
    assertThat(deleteTask.getAnnotation(DeleteMapping.class).value()).containsExactly("/{taskId}");
  }

  private void assertPatchMapping(String methodName, String path, Class<?>... parameterTypes)
      throws NoSuchMethodException {
    Method method =
        WorkspaceTaskCompatibilityController.class.getDeclaredMethod(methodName, parameterTypes);
    assertThat(method.getAnnotation(PatchMapping.class).value()).containsExactly(path);
  }
}
