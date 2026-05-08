package com.devpath.api.instructor.dto.qna;

public record QnaTimelineResponse(
    QnaInboxResponse question,
    QnaAnswerResponse publishedAnswer,
    QnaDraftResponse draft,
    String lectureTitle,
    String lectureTimestamp) {}
