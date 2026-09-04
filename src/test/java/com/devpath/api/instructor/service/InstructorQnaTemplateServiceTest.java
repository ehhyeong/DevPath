package com.devpath.api.instructor.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.devpath.api.instructor.dto.qna.QnaTemplateRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.domain.instructor.entity.QnaTemplate;
import com.devpath.domain.instructor.repository.QnaTemplateRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InstructorQnaTemplateServiceTest {

  @Mock private QnaTemplateRepository templateRepository;
  @InjectMocks private InstructorQnaTemplateService service;

  @Test
  void updateTemplateRejectsAnotherInstructorTemplate() {
    QnaTemplate template =
        QnaTemplate.builder().id(21L).instructorId(8L).title("기존 템플릿").content("기존 답변").build();
    QnaTemplateRequest request = mock(QnaTemplateRequest.class);
    when(templateRepository.findByIdAndIsDeletedFalse(21L)).thenReturn(Optional.of(template));

    assertThatThrownBy(() -> service.updateTemplate(21L, 7L, request))
        .isInstanceOf(CustomException.class);
  }
}
