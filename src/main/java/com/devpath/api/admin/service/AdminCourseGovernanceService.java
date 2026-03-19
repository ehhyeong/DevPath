package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.PendingCourseResponse;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.course.entity.Course;
import com.devpath.domain.course.entity.CourseStatus;
import com.devpath.domain.course.repository.CourseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminCourseGovernanceService {

    private final CourseRepository courseRepository;

    // 1. 승인 대기(IN_REVIEW) 강의 목록 조회
    public List<PendingCourseResponse> getPendingCourses() {
        // 실제 저장소 enum인 IN_REVIEW 사용
        return courseRepository.findByStatus(CourseStatus.IN_REVIEW)
                .stream()
                .map(PendingCourseResponse::from)
                .collect(Collectors.toList());
    }

    // 2. 강의 승인
    @Transactional
    public void approveCourse(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));

        course.approve(); // PUBLISHED로 변경
    }

    // 3. 강의 반려
    @Transactional
    public void rejectCourse(Long courseId) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));

        course.reject(); // DRAFT로 변경
    }
}