package com.devpath.api.instructor.service;

import com.devpath.domain.course.entity.Course;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
class InstructorCourseThumbnailResolver {

  private static final String DEFAULT_COURSE_THUMBNAIL =
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80";

  private static final Map<String, String> COURSE_THUMBNAIL_FALLBACKS =
      Map.ofEntries(
          Map.entry(
              "Spring Boot Intro",
              "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80"),
          Map.entry(
              "JPA Practical Design",
              "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80"),
          Map.entry(
              "React Dashboard Sprint",
              "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80"),
          Map.entry(
              "[A-CASE-A] Node Clearance Course",
              "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80"),
          Map.entry(
              "[A-CASE-B] Tag Missing Course",
              "https://images.unsplash.com/photo-1504639725590-34d0984388bd?auto=format&fit=crop&w=1200&q=80"),
          Map.entry(
              "[A-CASE-C] Quiz Fail Course",
              "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80"));

  String resolve(Course course) {
    String thumbnailUrl = normalizeBlank(course.getThumbnailUrl());

    if (thumbnailUrl != null) {
      String normalizedThumbnailUrl = thumbnailUrl.toLowerCase();

      if (normalizedThumbnailUrl.startsWith("http://")
          || normalizedThumbnailUrl.startsWith("https://")
          || normalizedThumbnailUrl.startsWith("data:")) {
        return thumbnailUrl;
      }
    }

    return COURSE_THUMBNAIL_FALLBACKS.getOrDefault(course.getTitle(), DEFAULT_COURSE_THUMBNAIL);
  }

  private String normalizeBlank(String value) {
    return value == null || value.isBlank() ? null : value.trim();
  }
}
