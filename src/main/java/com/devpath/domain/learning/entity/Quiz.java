package com.devpath.domain.learning.entity;

import com.devpath.domain.roadmap.entity.RoadmapNode;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "quizzes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "quiz_id")
    private Long id;

    // 어떤 노드(과목)에 달린 퀴즈인가?
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "node_id", nullable = false)
    private RoadmapNode roadmapNode;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String question;

    @Column(nullable = false, length = 500)
    private String answer; // 정답

    @Column(length = 500)
    private String options; // 객관식일 경우 보기 (JSON 형태로 저장 예정)

    @Builder
    public Quiz(RoadmapNode roadmapNode, String question, String answer, String options) {
        this.roadmapNode = roadmapNode;
        this.question = question;
        this.answer = answer;
        this.options = options;
    }
}