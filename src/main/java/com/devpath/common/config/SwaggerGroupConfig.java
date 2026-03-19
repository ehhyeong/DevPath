package com.devpath.common.config;

import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerGroupConfig {

  @Bean
  public GroupedOpenApi learnerApi() {
    return GroupedOpenApi.builder()
        .group("learner")
        .displayName("학습자")
        .pathsToMatch(
            "/api/auth/**",
            "/api/courses/**",
            "/api/me/**",
            "/api/my-roadmaps/**",
            "/api/roadmaps/**",
            "/api/users/**")
        .build();
  }

  @Bean
  public GroupedOpenApi instructorApi() {
    return GroupedOpenApi.builder()
        .group("instructor")
        .displayName("강사")
        .pathsToMatch("/api/instructor/**", "/api/instructors/**")
        .build();
  }

  @Bean
  public GroupedOpenApi adminApi() {
    return GroupedOpenApi.builder()
        .group("admin")
        .displayName("관리자")
        .pathsToMatch("/api/admin/**")
        .build();
  }
}
