package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.governance.CourseApproveRequest;
import com.devpath.api.admin.dto.governance.CourseRejectRequest;
import com.devpath.api.admin.dto.governance.PendingCourseResponse;
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

    public List<PendingCourseResponse> getPendingCourses() {
        return courseRepository.findByStatus(CourseStatus.IN_REVIEW)
                .stream()
                .map(PendingCourseResponse::from)
                .collect(Collectors.toList());
    }

    @Transactional
    public void approveCourse(Long courseId, CourseApproveRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));
        if (course.getStatus() != CourseStatus.IN_REVIEW) {
            throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
        }
        course.approve();
    }

    @Transactional
    public void rejectCourse(Long courseId, CourseRejectRequest request) {
        Course course = courseRepository.findById(courseId)
                .orElseThrow(() -> new CustomException(ErrorCode.COURSE_NOT_FOUND));
        if (course.getStatus() != CourseStatus.IN_REVIEW) {
            throw new CustomException(ErrorCode.INVALID_STATUS_TRANSITION);
        }
        course.reject();
    }
}