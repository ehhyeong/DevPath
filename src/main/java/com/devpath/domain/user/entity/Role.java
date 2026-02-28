package com.devpath.domain.user.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "roles")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_id")
    private Long id;

    @Column(name = "role_name", nullable = false, unique = true, length = 50)
    private String roleName; // 예: ROLE_LEARNER, ROLE_INSTRUCTOR, ROLE_ADMIN

    @Column(length = 200)
    private String description;

    @Builder
    public Role(String roleName, String description) {
        this.roleName = roleName;
        this.description = description;
    }
}