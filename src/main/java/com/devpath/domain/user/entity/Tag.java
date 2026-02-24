package com.devpath.domain.user.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "tags")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Tag {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "tag_id")
    private Long id;

    // 태그 이름 (예: Java, Spring Boot, MySQL)
    @Column(nullable = false, unique = true, length = 50)
    private String name;

    @Builder
    public Tag(String name) {
        this.name = name;
    }
}