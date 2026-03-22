package com.devpath.api.learning.dto;

import com.devpath.domain.course.entity.CourseMaterial;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
@Schema(description = "강의 학습 자료 응답 DTO")
public class CourseMaterialResponse {

    @Schema(description = "학습 자료 ID", example = "1")
    private Long materialId;

    @Schema(description = "자료 유형", example = "PDF")
    private String materialType;

    @Schema(description = "원본 파일명", example = "spring-security.pdf")
    private String originalFileName;

    @Schema(description = "원본 자료 URL", example = "https://cdn.devpath.ai/materials/spring-security.pdf")
    private String materialUrl;

    // 한글 주석: Swagger에서 메타 조회와 다운로드 엔드포인트 계약을 같이 보여준다.
    @Schema(description = "다운로드 API 경로", example = "/api/learning/lessons/10/materials/1/download")
    private String downloadPath;

    @Schema(description = "표시 순서", example = "0")
    private Integer displayOrder;

    public static CourseMaterialResponse from(CourseMaterial material) {
        return CourseMaterialResponse.builder()
                .materialId(material.getMaterialId())
                .materialType(material.getMaterialType())
                .originalFileName(material.getOriginalFileName())
                .materialUrl(material.getMaterialUrl())
                .downloadPath("/api/learning/lessons/" + material.getLesson().getLessonId()
                        + "/materials/" + material.getMaterialId() + "/download")
                .displayOrder(material.getDisplayOrder())
                .build();
    }
}
