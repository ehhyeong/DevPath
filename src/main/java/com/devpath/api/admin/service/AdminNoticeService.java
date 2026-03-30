package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.notice.NoticeCreateRequest;
import com.devpath.api.admin.dto.notice.NoticeResponse;
import com.devpath.api.notice.entity.Notice;
import com.devpath.api.notice.repository.NoticeRepository;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

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
                .isPinned(request.getIsPinned() != null ? request.getIsPinned() : false)
                .build();
        return NoticeResponse.from(noticeRepository.save(notice));
    }

    public NoticeResponse updateNotice(Long noticeId, Long adminId, NoticeCreateRequest request) {
        Notice notice = noticeRepository.findByIdAndIsDeletedFalse(noticeId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));
        notice.update(request.getTitle(), request.getContent(),
                request.getIsPinned() != null ? request.getIsPinned() : false);
        return NoticeResponse.from(notice);
    }

    public void deleteNotice(Long noticeId, Long adminId) {
        Notice notice = noticeRepository.findByIdAndIsDeletedFalse(noticeId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));
        notice.delete();
    }

    @Transactional(readOnly = true)
    public List<NoticeResponse> getNotices() {
        return noticeRepository.findByIsDeletedFalseOrderByIsPinnedDescCreatedAtDesc().stream()
                .map(NoticeResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public NoticeResponse getNotice(Long noticeId) {
        Notice notice = noticeRepository.findByIdAndIsDeletedFalse(noticeId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));
        return NoticeResponse.from(notice);
    }
}