package com.devpath.api.workspace.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.devpath.api.workspace.dto.WorkspaceAiDesignResponse;
import com.devpath.api.workspace.dto.WorkspaceErdRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.domain.workspace.entity.*;
import com.devpath.domain.workspace.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class WorkspaceAiWorkspaceInitializationServiceTest {
  @Mock WorkspaceAiDesignRepository designs;
  @Mock WorkspaceMemberRepository members;
  @Mock WorkspaceDocRepository docs;
  @Mock CalendarEventRepository events;
  @Mock MilestoneRepository milestones;
  @Mock WorkspaceTaskRepository tasks;
  @Mock WorkspaceErdDocumentService erd;
  WorkspaceAiWorkspaceInitializationService service;
  WorkspaceAiDesign saved;

  @BeforeEach
  void setUp() throws Exception {
    var mapper = new ObjectMapper();
    var design =
        new WorkspaceAiDesignResponse(
            "신고",
            "신고 접수",
            "mvp",
            null,
            null,
            new WorkspaceAiDesignResponse.Architecture(
                "모놀리스",
                "설계",
                List.of(),
                "erDiagram\n REPORTS {\n bigint id PK\n }",
                List.of(),
                List.of()),
            List.of(
                new WorkspaceAiDesignResponse.ApiSpec(
                    "POST", "/reports", "신고 접수", "JWT", "{}", "{}", "신고")),
            List.of(),
            List.of());
    saved = new WorkspaceAiDesign(42L, UUID.randomUUID(), mapper.writeValueAsString(design));
    service =
        new WorkspaceAiWorkspaceInitializationService(
            designs, members, docs, events, milestones, tasks, erd, mapper);
  }

  void allow() {
    when(members.existsByWorkspaceIdAndLearnerId(42L, 77L)).thenReturn(true);
    when(designs.findForUpdateByWorkspaceId(42L)).thenReturn(Optional.of(saved));
  }

  @Test
  void nonMemberCannotInitialize() {
    assertThatThrownBy(() -> service.initialize(42L, 88L)).isInstanceOf(CustomException.class);
    verifyNoInteractions(designs, docs, events, erd);
  }

  @Test
  void initializeUsesRealMilestoneAndTaskDatesAndRunsOnlyOnce() {
    allow();
    when(erd.findMermaidCodeForRead(42L, 77L)).thenReturn("erDiagram\n");
    when(milestones.findAllByWorkspaceIdAndIsDeletedFalseOrderByDueDateAsc(42L))
        .thenReturn(
            List.of(
                Milestone.builder()
                    .title("1. 신고 구현")
                    .startDate(LocalDate.of(2026, 10, 6))
                    .dueDate(LocalDate.of(2026, 10, 13))
                    .description("목표")
                    .build()));
    when(tasks.findAllByWorkspaceIdAndIsDeletedFalseOrderByCreatedAtDesc(42L))
        .thenReturn(
            List.of(
                WorkspaceTask.builder()
                    .id(101L)
                    .title("API 구현")
                    .dueDate(LocalDate.of(2026, 10, 13))
                    .build()));
    service.initialize(42L, 77L);
    service.initialize(42L, 77L);
    var calendar = ArgumentCaptor.forClass(CalendarEvent.class);
    verify(events, times(2)).save(calendar.capture());
    assertThat(calendar.getAllValues().get(0).getStartAt())
        .isEqualTo(LocalDate.of(2026, 10, 6).atStartOfDay());
    assertThat(calendar.getAllValues().get(1).getDescription())
        .contains("schedule-deadline:true", "DP-101");
    verify(erd).saveDocument(eq(42L), eq(77L), any(WorkspaceErdRequest.Save.class));
    verify(docs)
        .save(
            argThat(
                doc ->
                    doc.getContent().contains("/reports")
                        && doc.getContent().contains("\"group\":\"신고\"")));
    assertThat(saved.isAssetsInitialized()).isTrue();
  }

  @Test
  void editedDocumentsAndExistingCalendarArePreserved() {
    allow();
    when(docs.findByWorkspaceIdAndDocType(42L, WorkspaceDocType.API_SPEC))
        .thenReturn(Optional.of(WorkspaceDoc.builder().content("팀 명세").build()));
    when(erd.findMermaidCodeForRead(42L, 77L)).thenReturn("erDiagram\n TEAM { bigint id PK }");
    when(events.findAllByWorkspaceIdAndIsDeletedFalseOrderByStartAtAsc(42L))
        .thenReturn(List.of(CalendarEvent.builder().title("팀 일정").build()));
    service.initialize(42L, 77L);
    verify(docs, never()).save(any());
    verify(erd, never()).saveDocument(any(), any(), any());
    verify(events, never()).save(any());
    verifyNoInteractions(milestones, tasks);
  }
}
