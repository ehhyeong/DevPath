package com.devpath.domain.market.model;

public record RelatedLearningResource(
    String resourceType,
    String skillName,
    String title,
    String description,
    Integer priorityScore) {}
