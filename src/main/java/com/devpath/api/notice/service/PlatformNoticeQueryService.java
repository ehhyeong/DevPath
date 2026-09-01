package com.devpath.api.notice.service;

import com.devpath.api.notice.dto.PlatformNoticeResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.notice.repository.NoticeRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PlatformNoticeQueryService {

  private final NoticeRepository noticeRepository;

  public List<PlatformNoticeResponse> getNotices() {
    return noticeRepository.findByIsDeletedFalseOrderByIsPinnedDescCreatedAtDesc().stream()
        .map(PlatformNoticeResponse::from)
        .toList();
  }

  public PlatformNoticeResponse getNotice(Long noticeId) {
    return noticeRepository
        .findByIdAndIsDeletedFalse(noticeId)
        .map(PlatformNoticeResponse::from)
        .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));
  }
}
