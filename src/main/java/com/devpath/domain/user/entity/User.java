package com.devpath.domain.user.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "users") // SQL의 users 테이블과 매핑
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED) // 기본 생성자 접근 제어로 무분별한 생성 방지
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 100)
    private String name;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true; // 논리적 삭제(Soft Delete)를 위한 플래그

    // Setter 대신 의미 있는 비즈니스 메서드 사용 (팀 코딩 규칙)
    @Builder
    public User(String email, String password, String name) {
        this.email = email;
        this.password = password;
        this.name = name;
        this.isActive = true;
    }

    // 로그인 시간 업데이트 메서드
    public void updateLastLoginAt() {
        this.lastLoginAt = LocalDateTime.now();
    }

    // 계정 비활성화 (회원 탈퇴 시 물리적 삭제 대신 사용)
    public void deactivate() {
        this.isActive = false;
    }
}