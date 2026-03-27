package com.devpath.api.instructor.service;

import com.devpath.api.instructor.dto.notification.NotificationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class InstructorNotificationService {

    public List<NotificationResponse> getNotifications(Long instructorId) {
        // TODO: 실제 알림 시스템 연동 예정
        return List.of(
                NotificationResponse.builder()
                        .notificationId(1L)
                        .type("REVIEW")
                        .message("새로운 리뷰가 등록되었습니다.")
                        .isRead(false)
                        .createdAt(LocalDateTime.now().minusHours(1))
                        .build(),
                NotificationResponse.builder()
                        .notificationId(2L)
                        .type("QNA")
                        .message("새로운 Q&A 질문이 등록되었습니다.")
                        .isRead(false)
                        .createdAt(LocalDateTime.now().minusHours(3))
                        .build(),
                NotificationResponse.builder()
                        .notificationId(3L)
                        .type("SUBSCRIBE")
                        .message("새로운 구독자가 생겼습니다.")
                        .isRead(true)
                        .createdAt(LocalDateTime.now().minusDays(1))
                        .build()
        );
    }
}