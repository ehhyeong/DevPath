package com.devpath.api.learning.proof.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.devpath.api.learning.proof.component.ProofCardAssembler;
import com.devpath.common.exception.CustomException;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.LessonRepository;
import com.devpath.domain.learning.repository.LessonProgressRepository;
import com.devpath.domain.learning.repository.proof.ProofCardRepository;
import com.devpath.domain.learning.repository.proof.ProofCardTagRepository;
import com.devpath.domain.learning.service.LearningAutomationPolicyService;
import com.devpath.domain.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProofCardServiceAutomationRuleTest {

  @Mock private ProofCardRepository proofCardRepository;
  @Mock private ProofCardTagRepository proofCardTagRepository;
  @Mock private ProofCardAssembler proofCardAssembler;
  @Mock private CourseRepository courseRepository;
  @Mock private LessonRepository lessonRepository;
  @Mock private LessonProgressRepository lessonProgressRepository;
  @Mock private UserRepository userRepository;
  @Mock private LearningAutomationPolicyService learningAutomationPolicyService;
  @InjectMocks private ProofCardService proofCardService;

  @Test
  void disabledAutomaticIssueRuleStopsProofCardCreation() {
    when(learningAutomationPolicyService.isEnabled("PROOF_CARD_AUTO_ISSUE", true))
        .thenReturn(false);

    proofCardService.issueIfEligibleByCourse(1L, 2L);

    verifyNoInteractions(proofCardRepository, courseRepository, lessonRepository);
  }

  @Test
  void disabledManualIssueRuleRejectsManualCreation() {
    when(learningAutomationPolicyService.isEnabled("PROOF_CARD_MANUAL_ISSUE", true))
        .thenReturn(false);

    assertThatThrownBy(() -> proofCardService.issueManuallyByCourse(1L, 2L))
        .isInstanceOf(CustomException.class);
  }
}
