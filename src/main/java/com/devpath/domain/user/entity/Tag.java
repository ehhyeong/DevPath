package com.devpath.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tags") // 테이블명 명시
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Tag {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "tag_id")
    private Long tagId;

    @Column(nullable = false, unique = true)
    private String name;

    private String category;

    @Builder.Default
    @Column(name = "is_official")
    private Boolean isOfficial = true;

    public void updateTag(String name, String category) {
        this.name = name;
        this.category = category;
    }
}