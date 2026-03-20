package com.devpath.api.learning.dto;

import com.devpath.domain.course.entity.CourseMaterial;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CourseMaterialResponse {

    private Long materialId;
    private String materialType;
    private String originalFileName;
    private String materialUrl;
    private Integer displayOrder;

    public static CourseMaterialResponse from(CourseMaterial material) {
        return CourseMaterialResponse.builder()
                .materialId(material.getMaterialId())
                .materialType(material.getMaterialType())
                .originalFileName(material.getOriginalFileName())
                .materialUrl(material.getMaterialUrl())
                .displayOrder(material.getDisplayOrder())
                .build();
    }
}
