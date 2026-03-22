package com.devpath.domain.learning.entity.ocr;

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
@Table(name = "ocr_results")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
// One OCR row is tied to a single lesson frame for one learner.
public class OcrResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ocr_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;

    @Column(name = "frame_timestamp_second", nullable = false)
    private Integer frameTimestampSecond;

    @Column(name = "source_image_url", nullable = false, length = 500)
    private String sourceImageUrl;

    @Column(name = "status", nullable = false, length = 30)
    private String status;

    @Column(name = "extracted_text", columnDefinition = "TEXT")
    private String extractedText;

    @Column(name = "searchable_normalized_text", columnDefinition = "TEXT")
    private String searchableNormalizedText;

    @Column(name = "timestamp_mappings", columnDefinition = "TEXT")
    private String timestampMappings;

    @Column(name = "confidence")
    private Double confidence;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Builder
    public OcrResult(
            User user,
            Lesson lesson,
            Integer frameTimestampSecond,
            String sourceImageUrl,
            String status,
            String extractedText,
            String searchableNormalizedText,
            String timestampMappings,
            Double confidence
    ) {
        this.user = user;
        this.lesson = lesson;
        this.frameTimestampSecond = frameTimestampSecond;
        this.sourceImageUrl = sourceImageUrl;
        this.status = status == null ? "REQUESTED" : status;
        this.extractedText = extractedText;
        this.searchableNormalizedText = searchableNormalizedText;
        this.timestampMappings = timestampMappings;
        this.confidence = confidence;
    }

    public void markCompleted(
            String extractedText,
            String searchableNormalizedText,
            String timestampMappings,
            Double confidence
    ) {
        // Completion stores both the raw text and the search-friendly projection.
        this.extractedText = extractedText;
        this.searchableNormalizedText = searchableNormalizedText;
        this.timestampMappings = timestampMappings;
        this.confidence = confidence;
        this.status = "COMPLETED";
    }

    public void markFailed() {
        this.status = "FAILED";
    }
}
