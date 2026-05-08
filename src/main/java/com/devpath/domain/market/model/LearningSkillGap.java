package com.devpath.domain.market.model;

public record LearningSkillGap(
    String skillName,
    Long marketDemandCount,
    Boolean owned,
    Integer priorityScore,
    String reason) {}
