package com.devpath.domain.course.repository;

import com.devpath.domain.course.entity.CourseAnnouncement;
import com.devpath.domain.course.entity.CourseStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// 강의 공지/새소식 조회와 저장을 담당한다.
public interface CourseAnnouncementRepository extends JpaRepository<CourseAnnouncement, Long> {

    // 특정 강의의 공지 목록을 조회한다.
    List<CourseAnnouncement> findAllByCourseCourseIdOrderByPinnedDescDisplayOrderAscAnnouncementIdDesc(Long courseId);

    // 현재 로그인한 강사가 소유한 공지인지 검증하며 조회한다.
    Optional<CourseAnnouncement> findByAnnouncementIdAndCourseInstructorId(Long announcementId, Long instructorId);

    // 현재 로그인한 강사가 소유한 특정 강의의 공지인지 검증하며 조회한다.
    Optional<CourseAnnouncement> findByAnnouncementIdAndCourseCourseIdAndCourseInstructorId(
            Long announcementId,
            Long courseId,
            Long instructorId
    );

    // 특정 강의의 공지를 일괄 조회한다.
    List<CourseAnnouncement> findAllByAnnouncementIdInAndCourseCourseIdAndCourseInstructorId(
            List<Long> announcementIds,
            Long courseId,
            Long instructorId
    );

    // 특정 강의의 공지를 모두 삭제한다.
    void deleteAllByCourseCourseId(Long courseId);

    // 공개 강의 상세의 새소식 탭용 공지 목록을 조회한다.
    @Query("""
            select ca
            from CourseAnnouncement ca
            where ca.course.courseId = :courseId
              and ca.course.status = :courseStatus
              and ca.publishedAt is not null
              and ca.publishedAt <= :now
              and (ca.exposureStartAt is null or ca.exposureStartAt <= :now)
              and (ca.exposureEndAt is null or ca.exposureEndAt >= :now)
            order by ca.pinned desc, ca.displayOrder asc, ca.createdAt desc
            """)
    List<CourseAnnouncement> findPublicNewsTabAnnouncements(
            @Param("courseId") Long courseId,
            @Param("courseStatus") CourseStatus courseStatus,
            @Param("now") LocalDateTime now
    );
}
