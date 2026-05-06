package com.devpath.common.config;

import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerGroupConfig {

    @Bean
    public GroupedOpenApi learnerApi() {
        // 학습자 그룹에는 수강, 로드맵, 커뮤니티, 멘토링 협업, AI 보조 기능을 노출한다.
        return GroupedOpenApi.builder()
                .group("learner")
                .displayName("학습자")
                .pathsToMatch(
                        "/api/ai/**",
                        "/api/auth/**",
                        "/api/builder/**",
                        "/api/certificates/**",
                        "/api/courses/**",
                        "/api/direct-messages/**",
                        "/api/evaluation/learner/**",
                        "/api/home/**",
                        "/api/instructors/**",
                        "/api/jobs/**",
                        "/api/learning/**",
                        "/api/lounge/**",
                        "/api/me/**",
                        "/api/meetings/**",
                        "/api/market/**",
                        "/api/mentoring-applications/**",
                        "/api/mentoring-materials/**",
                        "/api/mentoring-missions/**",
                        "/api/mentoring-posts/**",
                        "/api/mentoring-questions/**",
                        "/api/mentorings/**",
                        "/api/mission-submissions/**",
                        "/api/my-roadmaps/**",
                        "/api/notifications/**",
                        "/api/posts/**",
                        "/api/comments/**",
                        "/api/project-ideas/**",
                        "/api/projects/**",
                        "/api/proof-card-shares/**",
                        "/api/pull-request-reviews/**",
                        "/api/pull-requests/**",
                        "/api/qna/**",
                        "/api/recommendations/**",
                        "/api/refunds/**",
                        "/api/reviews/**",
                        "/api/roadmaps/**",
                        "/api/study-groups/**",
                        "/api/study-matches/**",
                        "/api/users/**",
                        "/api/voice-channels/**",
                        "/api/workspace-questions/**",
                        "/api/workspace-notices/**",
                        "/api/workspaces/**")
                .build();
    }

    @Bean
    public GroupedOpenApi instructorApi() {
        // 강사 그룹에는 강의 제작, 평가 출제/채점, 강사 대시보드 기능을 노출한다.
        return GroupedOpenApi.builder()
                .group("instructor")
                .displayName("강사")
                .pathsToMatch(
                        "/api/evaluation/instructor/**",
                        "/api/instructor/**")
                .build();
    }

    @Bean
    public GroupedOpenApi adminApi() {
        // 관리자 그룹에는 운영자 전용 계정, 정책, 정산, 거버넌스 기능을 노출한다.
        return GroupedOpenApi.builder()
                .group("admin")
                .displayName("관리자")
                .pathsToMatch("/api/admin/**")
                .build();
    }
}
