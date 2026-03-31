package com.devpath.api.instructor.dto.qna;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class QnaTimelineResponse {

    private QnaInboxResponse question;
    private QnaAnswerResponse publishedAnswer;
    private QnaDraftResponse draft;
    private String lectureTitle;
    private String lectureTimestamp;
}
