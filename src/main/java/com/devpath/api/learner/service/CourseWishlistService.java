package com.devpath.api.learner.service;

import com.devpath.api.learner.dto.CourseWishlistDto;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseWishlist;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseWishlistRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseWishlistService {

  private final CourseWishlistRepository courseWishlistRepository;
  private final CourseRepository courseRepository;
  private final UserRepository userRepository;

  @Transactional
  public void addToWishlist(Long userId, Long courseId) {
    if (courseWishlistRepository.existsByUser_IdAndCourse_CourseId(userId, courseId)) {
      throw new CustomException(ErrorCode.ALREADY_EXISTS, "이미 찜한 강의입니다.");
    }

    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));
    Course course =
        courseRepository
            .findById(courseId)
            .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));
    CourseWishlist wishlist = CourseWishlist.builder().user(user).course(course).build();

    courseWishlistRepository.save(wishlist);
  }

  @Transactional
  public CourseWishlistDto.AddWishlistResponse addToWishlistResponse(Long userId, Long courseId) {
    addToWishlist(userId, courseId);
    return CourseWishlistDto.AddWishlistResponse.of(courseId);
  }

  @Transactional
  public void removeFromWishlist(Long userId, Long courseId) {
    CourseWishlist wishlist =
        courseWishlistRepository
            .findByUser_IdAndCourse_CourseId(userId, courseId)
            .orElseThrow(() -> new CustomException(ErrorCode.WISHLIST_NOT_FOUND));

    courseWishlistRepository.delete(wishlist);
  }

  @Transactional
  public CourseWishlistDto.RemoveWishlistResponse removeFromWishlistResponse(
      Long userId, Long courseId) {
    removeFromWishlist(userId, courseId);
    return CourseWishlistDto.RemoveWishlistResponse.of(courseId);
  }

  public List<CourseWishlist> getMyWishlist(Long userId) {
    return courseWishlistRepository.findAllByUserIdWithCourse(userId);
  }

  public List<CourseWishlistDto.WishlistResponse> getMyWishlistResponses(Long userId) {
    return getMyWishlist(userId).stream().map(CourseWishlistDto.WishlistResponse::from).toList();
  }

  public boolean isWishlisted(Long userId, Long courseId) {
    return courseWishlistRepository.existsByUser_IdAndCourse_CourseId(userId, courseId);
  }

  public Set<Long> getWishlistedCourseIds(Long userId, Collection<Long> courseIds) {
    if (userId == null || courseIds == null || courseIds.isEmpty()) {
      return Set.of();
    }

    return new HashSet<>(
        courseWishlistRepository.findCourseIdsByUserIdAndCourseIds(userId, courseIds));
  }
}
