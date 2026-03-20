package com.devpath.domain.learning.entity;

import com.devpath.domain.course.entity.Lesson;
import com.devpath.domain.user.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(name = "timestamp_notes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TimestampNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "note_id")
    private Long id;

    // 노트를 작성한 학습자와의 연관관계다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 노트가 귀속되는 강의 레슨과의 연관관계다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    // 노트가 연결된 영상의 재생 위치를 초 단위로 저장한다.
    // 클릭 시 해당 구간으로 이동하는 기능의 기준 값이 된다.
    @Column(name = "timestamp_second", nullable = false)
    private Integer timestampSecond;

    // 학습자가 해당 구간에서 작성한 노트 본문이다.
    @Column(columnDefinition = "TEXT", nullable = false)
    private String content;

    // 논리 삭제 플래그로 실제 레코드는 유지하면서 노출만 차단한다.
    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    // 생성 시각을 자동 저장한다.
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // 수정 시각을 자동 갱신한다.
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public TimestampNote(User user, Lesson lesson, Integer timestampSecond, String content) {
        this.user = user;
        this.lesson = lesson;
        this.timestampSecond = timestampSecond;
        this.content = content;
        this.isDeleted = false;
    }

    // 노트 본문과 타임스탬프 위치를 함께 수정한다.
    public void updateContent(Integer timestampSecond, String content) {
        this.timestampSecond = timestampSecond;
        this.content = content;
    }

    // 노트를 soft delete 처리한다.
    public void delete() {
        this.isDeleted = true;
    }
}
