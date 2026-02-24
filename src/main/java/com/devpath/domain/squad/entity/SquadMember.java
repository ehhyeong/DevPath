package com.devpath.domain.squad.entity;

import com.devpath.domain.user.entity.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "squad_members")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SquadMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "squad_member_id")
    private Long id;

    // 어떤 스쿼드에 속해 있는가?
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "squad_id", nullable = false)
    private Squad squad;

    // 누가 속해 있는가?
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 직책 (팀장인지 팀원인지)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SquadRole role;

    @CreationTimestamp
    @Column(name = "joined_at", updatable = false)
    private LocalDateTime joinedAt;

    @Builder
    public SquadMember(Squad squad, User user, SquadRole role) {
        this.squad = squad;
        this.user = user;
        this.role = role;
    }

    // 팀원 권한 변경 (예: 팀원에서 팀장으로 승급)
    public void changeRole(SquadRole newRole) {
        this.role = newRole;
    }
}