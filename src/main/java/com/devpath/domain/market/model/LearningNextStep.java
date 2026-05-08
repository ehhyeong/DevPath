package com.devpath.domain.market.model;

public record LearningNextStep(
    String skillName,
    Integer stepOrder,
    String title,
    String description,
    String recommendedAction) {}
