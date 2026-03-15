package com.devpath.domain.roadmap.entity;

import lombok.Getter;

@Getter
public enum QuizDifficulty {
    BEGINNER("초급"),
    INTERMEDIATE("중급"),
    ADVANCED("고급");

    private final String description;

    QuizDifficulty(String description) {
        this.description = description;
    }
}
