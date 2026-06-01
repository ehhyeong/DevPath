package com.devpath.api.job.controller;

import com.devpath.api.job.dto.JobSkillSuggestionDto;
import com.devpath.api.job.service.JobSkillSuggestionService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerTag;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = SwaggerTag.JOB_RECOMMENDATION, description = "학습자 참고용 채용 공고 추천 API")
@RestController
@RequiredArgsConstructor
public class JobSkillSuggestionController {

  private final JobSkillSuggestionService jobSkillSuggestionService;

  @PostMapping("/api/jobs/skill-suggestions")
  @Operation(
      summary = "성장공고 보완 스킬 로드맵 연동",
      description =
          "성장공고의 보완 스킬을 학습하기 위해, 학습 중인 커스텀 로드맵이 있으면 가장 걸맞는 로드맵에 심화/복습 노드 추가를 제안하고, "
              + "없으면 해당 기술의 학습 로드맵을 새로 생성한다.")
  public ResponseEntity<ApiResponse<JobSkillSuggestionDto.Response>> suggest(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
      @Valid @RequestBody JobSkillSuggestionDto.Request request) {
    return ResponseEntity.ok(
        ApiResponse.ok(
            jobSkillSuggestionService.suggest(userId, request.getSkill(), request.getJobTitle())));
  }
}
