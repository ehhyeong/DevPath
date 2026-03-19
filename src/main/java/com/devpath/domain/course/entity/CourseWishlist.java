package com.devpath.domain.course.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "course_wishlists",
    uniqueConstraints = {
        @UniqueConstraint(
            name = "uk_wishlist_user_course",
            columnNames = {"user_id", "course_id"}
        )
    },
    indexes = {
        @Index(name = "idx_wishlist_user_id", columnList = "user_id"),
        @Index(name = "idx_wishlist_course_id", columnList = "course_id")
    }
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CourseWishlist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "wishlist_id")
    private Long wishlistId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public CourseWishlist(User user, Course course) {
        this.user = user;
        this.course = course;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
