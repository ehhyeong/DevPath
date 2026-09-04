package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.qna.QnaTemplateRequest;
import com.devpath.api.instructor.dto.qna.QnaTemplateResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.instructor.entity.QnaTemplate;
import com.devpath.domain.instructor.repository.QnaTemplateRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class InstructorQnaTemplateService {

  private final QnaTemplateRepository templateRepository;

  public QnaTemplateResponse createTemplate(Long instructorId, QnaTemplateRequest request) {
    QnaTemplate template =
        QnaTemplate.builder()
            .instructorId(instructorId)
            .title(request.getTitle())
            .content(request.getContent())
            .build();
    return QnaTemplateResponse.from(templateRepository.save(template));
  }

  @Transactional(readOnly = true)
  public List<QnaTemplateResponse> getTemplates(Long instructorId) {
    return templateRepository.findByInstructorIdAndIsDeletedFalse(instructorId).stream()
        .map(QnaTemplateResponse::from)
        .toList();
  }

  public QnaTemplateResponse updateTemplate(
      Long templateId, Long instructorId, QnaTemplateRequest request) {
    QnaTemplate template = getActiveTemplate(templateId, instructorId);
    template.update(request.getTitle(), request.getContent());
    return QnaTemplateResponse.from(template);
  }

  public void deleteTemplate(Long templateId, Long instructorId) {
    getActiveTemplate(templateId, instructorId).delete();
  }

  private QnaTemplate getActiveTemplate(Long templateId, Long instructorId) {
    QnaTemplate template =
        templateRepository
            .findByIdAndIsDeletedFalse(templateId)
            .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
    if (!template.getInstructorId().equals(instructorId)) {
      throw new CustomException(ErrorCode.UNAUTHORIZED_ACTION);
    }
    return template;
  }
}
