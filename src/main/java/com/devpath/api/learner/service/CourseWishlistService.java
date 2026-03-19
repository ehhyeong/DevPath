package com.devpath.api.learner.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseWishlist;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.course.repository.CourseWishlistRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseWishlistService {

    private final CourseWishlistRepository courseWishlistRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    /**
     * 찜 추가
     */
    @Transactional
    public void addToWishlist(Long userId, Long courseId) {
        // 1. 이미 찜했는지 확인
        if (courseWishlistRepository.existsByUser_IdAndCourse_CourseId(userId, courseId)) {
            throw new CustomException(ErrorCode.ALREADY_EXISTS, "이미 찜한 강의입니다.");
        }

        // 2. User 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 3. Course 조회
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));

        // 4. Wishlist 생성 및 저장
        CourseWishlist wishlist = CourseWishlist.builder()
                .user(user)
                .course(course)
                .build();

        courseWishlistRepository.save(wishlist);
    }

    /**
     * 찜 삭제
     */
    @Transactional
    public void removeFromWishlist(Long userId, Long courseId) {
        CourseWishlist wishlist = courseWishlistRepository
                .findByUser_IdAndCourse_CourseId(userId, courseId)
                .orElseThrow(() -> new CustomException(ErrorCode.WISHLIST_NOT_FOUND));

        courseWishlistRepository.delete(wishlist);
    }

    /**
     * 내 찜 목록 조회
     */
    public List<CourseWishlist> getMyWishlist(Long userId) {
        return courseWishlistRepository.findAllByUserIdWithCourse(userId);
    }

    /**
     * 찜 여부 확인
     */
    public boolean isWishlisted(Long userId, Long courseId) {
        return courseWishlistRepository.existsByUser_IdAndCourse_CourseId(userId, courseId);
    }
}
