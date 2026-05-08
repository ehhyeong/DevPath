package com.devpath.api.instructor.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

@Entity
@Table(name = "instructor_mentoring_board")
@EntityListeners(AuditingEntityListener.class)
public class InstructorMentoringBoard {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private Long instructorId;

  @Column(columnDefinition = "TEXT", nullable = false)
  private String payloadJson;

  @CreatedDate private LocalDateTime createdAt;

  @LastModifiedDate private LocalDateTime updatedAt;

  protected InstructorMentoringBoard() {}

  public InstructorMentoringBoard(Long instructorId, String payloadJson) {
    this.instructorId = instructorId;
    this.payloadJson = payloadJson;
  }

  public Long getId() {
    return id;
  }

  public Long getInstructorId() {
    return instructorId;
  }

  public String getPayloadJson() {
    return payloadJson;
  }

  public void updatePayload(String payloadJson) {
    this.payloadJson = payloadJson;
  }
}
