package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.notice.NoticeCreateRequest;
import com.devpath.api.admin.dto.notice.NoticeResponse;
import com.devpath.api.notice.entity.Notice;
import com.devpath.api.notice.repository.NoticeRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminNoticeService {

    private final NoticeRepository noticeRepository;

    public NoticeResponse createNotice(Long adminId, NoticeCreateRequest request) {
        Notice notice = Notice.builder()
                .authorId(adminId)
                .title(request.getTitle())
                .content(request.getContent())
                .isPinned(Boolean.TRUE.equals(request.getIsPinned()))
                .build();

        return NoticeResponse.from(noticeRepository.save(notice));
    }

    public NoticeResponse updateNotice(Long noticeId, Long adminId, NoticeCreateRequest request) {
        Notice notice = getActiveNotice(noticeId);

        // 공지는 전사 운영 자산이라 관리자라면 누구나 수정 가능하게 둔다.
        notice.update(
                request.getTitle(),
                request.getContent(),
                Boolean.TRUE.equals(request.getIsPinned())
        );
        return NoticeResponse.from(notice);
    }

    public void deleteNotice(Long noticeId, Long adminId) {
        Notice notice = getActiveNotice(noticeId);
        notice.delete();
    }

    @Transactional(readOnly = true)
    public List<NoticeResponse> getNotices() {
        return noticeRepository.findByIsDeletedFalseOrderByIsPinnedDescCreatedAtDesc()
                .stream()
                .map(NoticeResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public NoticeResponse getNotice(Long noticeId) {
        return NoticeResponse.from(getActiveNotice(noticeId));
    }

    private Notice getActiveNotice(Long noticeId) {
        return noticeRepository.findByIdAndIsDeletedFalse(noticeId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));
    }
}
