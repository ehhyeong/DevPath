package com.devpath.common.config;

import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerGroupConfig {

    @Bean
    public GroupedOpenApi learnerApi() {
        // 한글 주석: 학습자 그룹에는 학습/추천과 학습자용 평가 API까지 함께 노출한다.
        return GroupedOpenApi.builder()
                .group("learner")
                .displayName("학습자")
                .pathsToMatch(
                        "/api/auth/**",
                        "/api/courses/**",
                        "/api/evaluation/learner/**",
                        "/api/learning/**",
                        "/api/me/**",
                        "/api/my-roadmaps/**",
                        "/api/recommendations/**",
                        "/api/roadmaps/**",
                        "/api/users/**")
                .build();
    }

    @Bean
    public GroupedOpenApi instructorApi() {
        return GroupedOpenApi.builder()
                .group("instructor")
                .displayName("강사")
                .pathsToMatch(
                        "/api/instructor/**", "/api/instructors/**", "/api/evaluation/instructor/**")
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
