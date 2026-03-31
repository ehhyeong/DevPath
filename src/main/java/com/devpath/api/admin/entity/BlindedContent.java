package com.devpath.api.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "blinded_content")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
@EntityListeners(AuditingEntityListener.class)
public class BlindedContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long contentId;

    @Column(nullable = false)
    private Long adminId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String reason;

    @Builder.Default
    @Column(nullable = false)
    private Boolean isActive = true;

    @CreatedDate
    private LocalDateTime blindedAt;

    // 같은 콘텐츠를 다시 블라인드하면 사유와 처리자만 최신값으로 갱신한다.
    public void blind(Long adminId, String reason) {
        this.adminId = adminId;
        this.reason = reason;
        this.isActive = true;
    }
}
