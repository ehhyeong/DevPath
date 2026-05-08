package com.devpath.api.mentoring.service;

import com.devpath.api.mentoring.dto.MentoringPostRequest;
import com.devpath.api.mentoring.dto.MentoringPostResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.mentoring.entity.MentoringPost;
import com.devpath.domain.mentoring.entity.MentoringPostStatus;
import com.devpath.domain.mentoring.repository.MentoringPostRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MentoringPostService {

  private final MentoringPostRepository mentoringPostRepository;
  private final UserRepository userRepository;

  @Transactional
  public MentoringPostResponse.Detail create(MentoringPostRequest.Create request) {
    // mentorId가 잘못된 경우 공고 생성 전에 명확한 비즈니스 예외를 발생시킨다.
    User mentor =
        userRepository
            .findById(request.mentorId())
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    // Entity 생성은 Service에서 처리하고 Controller에는 노출하지 않는다.
    MentoringPost post =
        MentoringPost.builder()
            .mentor(mentor)
            .title(request.title())
            .content(request.content())
            .requiredStacks(request.requiredStacks())
            .maxParticipants(request.maxParticipants())
            .build();

    return MentoringPostResponse.Detail.from(mentoringPostRepository.save(post));
  }

  public List<MentoringPostResponse.Summary> getPosts(MentoringPostStatus status) {
    // status가 없으면 전체 조회, 있으면 해당 상태만 필터링한다.
    List<MentoringPost> posts =
        status == null
            ? mentoringPostRepository.findAllByIsDeletedFalseOrderByCreatedAtDesc()
            : mentoringPostRepository.findAllByStatusAndIsDeletedFalseOrderByCreatedAtDesc(status);

    // Entity를 직접 반환하지 않고 목록 응답 DTO로 변환한다.
    return posts.stream().map(MentoringPostResponse.Summary::from).toList();
  }

  public MentoringPostResponse.Detail getPost(Long postId) {
    // 단건 조회도 Soft Delete 된 데이터는 제외한다.
    return MentoringPostResponse.Detail.from(getActivePost(postId));
  }

  @Transactional
  public MentoringPostResponse.Detail update(Long postId, MentoringPostRequest.Update request) {
    MentoringPost post = getActivePost(postId);

    // setter 대신 Entity의 의미 있는 비즈니스 메서드로 상태를 변경한다.
    post.update(
        request.title(), request.content(), request.requiredStacks(), request.maxParticipants());

    return MentoringPostResponse.Detail.from(post);
  }

  @Transactional
  public void delete(Long postId) {
    MentoringPost post = getActivePost(postId);

    // 물리 삭제 대신 Soft Delete를 적용한다.
    post.delete();
  }

  private MentoringPost getActivePost(Long postId) {
    // 조회 공통 로직을 private 메서드로 분리해 중복과 NPE 가능성을 줄인다.
    return mentoringPostRepository
        .findByIdAndIsDeletedFalse(postId)
        .orElseThrow(() -> new CustomException(ErrorCode.MENTORING_POST_NOT_FOUND));
  }
}
