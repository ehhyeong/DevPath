package com.devpath.api.instructor.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Entity
@Table(name = "instructor_comment")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class InstructorComment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long postId;

    @Column(nullable = false)
    private Long authorId;

    private Long parentCommentId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    @Builder.Default
    private int likeCount = 0;

    @Builder.Default
    private Boolean isDeleted = false;

    @CreatedDate
    private LocalDateTime createdAt;

    public void updateContent(String content) {
        this.content = content;
    }

    public void delete() {
        this.isDeleted = true;
    }

    public void incrementLikeCount() {
        this.likeCount++;
    }

    public void decrementLikeCount() {
        if (this.likeCount > 0) this.likeCount--;
    }
}