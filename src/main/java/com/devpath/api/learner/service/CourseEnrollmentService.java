package com.devpath.api.learner.service;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseEnrollment;
import com.devpath.domain.course.entity.EnrollmentStatus;
import com.devpath.domain.course.repository.CourseEnrollmentRepository;
import com.devpath.domain.course.repository.CourseRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CourseEnrollmentService {

    private final CourseEnrollmentRepository courseEnrollmentRepository;
    private final CourseRepository courseRepository;
    private final UserRepository userRepository;

    /**
     * 수강 신청
     */
    @Transactional
    public CourseEnrollment enroll(Long userId, Long courseId) {
        // 1. 이미 수강 중인지 확인
        if (courseEnrollmentRepository.existsByUser_IdAndCourse_CourseId(userId, courseId)) {
            throw new CustomException(ErrorCode.ALREADY_EXISTS, "이미 수강 중인 강의입니다.");
        }

        // 2. User 조회
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        // 3. Course 조회
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));

        // 4. Enrollment 생성 및 저장
        CourseEnrollment enrollment = CourseEnrollment.builder()
                .user(user)
                .course(course)
                .build();

        return courseEnrollmentRepository.save(enrollment);
    }

    /**
     * 내 수강 내역 조회
     */
    public List<CourseEnrollment> getMyEnrollments(Long userId) {
        return courseEnrollmentRepository.findAllByUserIdWithCourse(userId);
    }

    /**
     * 상태별 수강 내역 조회
     */
    public List<CourseEnrollment> getMyEnrollmentsByStatus(Long userId, EnrollmentStatus status) {
        return courseEnrollmentRepository.findAllByUserIdAndStatusWithCourse(userId, status);
    }

    /**
     * 수강 여부 확인
     */
    public boolean isEnrolled(Long userId, Long courseId) {
        return courseEnrollmentRepository.existsByUser_IdAndCourse_CourseId(userId, courseId);
    }

    /**
     * 진도율 업데이트
     */
    @Transactional
    public void updateProgress(Long userId, Long courseId, Integer progressPercentage) {
        CourseEnrollment enrollment = courseEnrollmentRepository
                .findByUser_IdAndCourse_CourseId(userId, courseId)
                .orElseThrow(() -> new CustomException(ErrorCode.ENROLLMENT_NOT_FOUND));

        enrollment.updateProgress(progressPercentage);
    }

    /**
     * 마지막 접속 시간 업데이트
     */
    @Transactional
    public void updateLastAccessed(Long userId, Long courseId) {
        CourseEnrollment enrollment = courseEnrollmentRepository
                .findByUser_IdAndCourse_CourseId(userId, courseId)
                .orElseThrow(() -> new CustomException(ErrorCode.ENROLLMENT_NOT_FOUND));

        enrollment.updateLastAccessed();
    }
}
