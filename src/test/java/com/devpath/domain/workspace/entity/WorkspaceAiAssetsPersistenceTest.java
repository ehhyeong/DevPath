package com.devpath.domain.workspace.entity;

import static org.assertj.core.api.Assertions.*;

import com.devpath.domain.workspace.repository.WorkspaceAiDesignRepository;
import com.devpath.domain.workspace.repository.WorkspaceDocRepository;
import com.devpath.domain.workspace.repository.WorkspaceInterviewPracticeRepository;
import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class WorkspaceAiAssetsPersistenceTest {
  @Autowired WorkspaceAiDesignRepository designs;
  @Autowired WorkspaceInterviewPracticeRepository practices;
  @Autowired WorkspaceDocRepository docs;
  @Autowired EntityManager entityManager;

  @Test
  void initializationFlagSurvivesPersistenceContextReload() {
    designs.saveAndFlush(new WorkspaceAiDesign(84001L, UUID.randomUUID(), "{}"));
    var design = designs.findForUpdateByWorkspaceId(84001L).orElseThrow();
    design.markAssetsInitialized();
    entityManager.flush();
    entityManager.clear();
    assertThat(designs.findByWorkspaceId(84001L).orElseThrow().isAssetsInitialized()).isTrue();
  }

  @Test
  void editedDesignJsonSurvivesPersistenceContextReloadWithoutLosingInitializationFlag() {
    var saved = designs.saveAndFlush(new WorkspaceAiDesign(84005L, UUID.randomUUID(), "{}"));
    saved.markAssetsInitialized();
    saved.updateDesign(
        "{\"scenario\":{\"coreFeatures\":[\"신고\"],\"featureIds\":[\"F3\"],\"nextFeatureNumber\":4}}");
    entityManager.flush();
    entityManager.clear();
    var reloaded = designs.findByWorkspaceId(84005L).orElseThrow();
    assertThat(reloaded.getDesignJson()).contains("\"F3\"", "\"nextFeatureNumber\":4");
    assertThat(reloaded.isAssetsInitialized()).isTrue();
    assertThat(reloaded.getJobId()).isEqualTo(saved.getJobId());
  }

  @Test
  void personalAndSharedPracticeAreStoredSeparatelyAndByAccount() {
    var first = new WorkspaceInterviewPractice(84002L, 77L, "개인 답변");
    first.shareAnswers("공개 답변");
    practices.saveAndFlush(first);
    practices.saveAndFlush(new WorkspaceInterviewPractice(84002L, 88L, "다른 사람의 개인 답변"));
    entityManager.clear();
    var reloaded = practices.findByWorkspaceIdAndUserId(84002L, 77L).orElseThrow();
    assertThat(reloaded.getContent()).isEqualTo("개인 답변");
    assertThat(reloaded.getSharedAnswers()).isEqualTo("공개 답변");
    assertThat(practices.findByWorkspaceIdAndUserId(84002L, 99L)).isEmpty();
  }

  @Test
  void duplicateAccountPracticeIsRejectedByDatabase() {
    practices.saveAndFlush(new WorkspaceInterviewPractice(84003L, 77L, "{}"));
    assertThatThrownBy(
            () -> practices.saveAndFlush(new WorkspaceInterviewPractice(84003L, 77L, "{}")))
        .isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test
  void sharedQuestionDocumentTypeCanBeStored() {
    docs.saveAndFlush(
        WorkspaceDoc.builder()
            .workspaceId(84004L)
            .updatedById(77L)
            .docType(WorkspaceDocType.INTERVIEW_QUESTIONS)
            .content("{\"questions\":[]}")
            .build());
    entityManager.clear();
    assertThat(docs.findByWorkspaceIdAndDocType(84004L, WorkspaceDocType.INTERVIEW_QUESTIONS))
        .isPresent();
  }
}
