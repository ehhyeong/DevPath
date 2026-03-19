package com.devpath.domain.learning.entity;

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
@Table(name = "assignment_submission_files")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SubmissionFile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "file_id")
    private Long id;

    // 이 파일이 어떤 제출에 속하는지 나타내는 상위 연관관계다.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "submission_id", nullable = false)
    private Submission submission;

    // 업로드된 파일의 원본 이름 또는 표시 이름을 저장한다.
    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    // 저장소 또는 S3 등에서 접근 가능한 파일 URL을 저장한다.
    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    // 파일 크기를 byte 단위로 저장한다.
    @Column(name = "file_size")
    private Long fileSize;

    // MIME 타입 또는 확장자 기반 파일 종류를 저장한다.
    @Column(name = "file_type", length = 100)
    private String fileType;

    // 실제 삭제 대신 논리 삭제를 적용하기 위한 플래그다.
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
    public SubmissionFile(
            Submission submission,
            String fileName,
            String fileUrl,
            Long fileSize,
            String fileType,
            Boolean isDeleted
    ) {
        this.submission = submission;
        this.fileName = fileName;
        this.fileUrl = fileUrl;
        this.fileSize = fileSize;
        this.fileType = fileType;
        this.isDeleted = isDeleted == null ? false : isDeleted;
    }

    // Submission.addFile()에서 내부적으로 사용하는 상위 제출 할당 메서드다.
    void assignSubmission(Submission submission) {
        this.submission = submission;
    }

    // 파일명, URL, 크기, 파일 타입 메타데이터를 한 번에 수정한다.
    public void updateFileInfo(String fileName, String fileUrl, Long fileSize, String fileType) {
        this.fileName = fileName;
        this.fileUrl = fileUrl;
        this.fileSize = fileSize;
        this.fileType = fileType;
    }

    // 제출 파일을 soft delete 처리한다.
    public void delete() {
        this.isDeleted = true;
    }
}
