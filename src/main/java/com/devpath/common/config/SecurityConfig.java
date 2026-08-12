package com.devpath.common.config;

import static com.devpath.common.security.AdminAuthorityService.ACCOUNT_MANAGE;
import static com.devpath.common.security.AdminAuthorityService.DASHBOARD_READ;
import static com.devpath.common.security.AdminAuthorityService.FINANCE_MANAGE;
import static com.devpath.common.security.AdminAuthorityService.GOVERNANCE_MANAGE;
import static com.devpath.common.security.AdminAuthorityService.JOB_MANAGE;
import static com.devpath.common.security.AdminAuthorityService.LEARNING_MANAGE;
import static com.devpath.common.security.AdminAuthorityService.MODERATION_RESOLVE;
import static com.devpath.common.security.AdminAuthorityService.NOTICE_WRITE;
import static com.devpath.common.security.AdminAuthorityService.SUPER_ADMIN_AUTHORITY;

import com.devpath.common.security.ApiAccessDeniedHandler;
import com.devpath.common.security.ApiAuthenticationEntryPoint;
import com.devpath.common.security.CustomOAuth2UserService;
import com.devpath.common.security.JwtAuthenticationFilter;
import com.devpath.common.security.OAuth2FailureHandler;
import com.devpath.common.security.OAuth2SuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
// Spring Security 인증/인가 정책을 구성하는 설정
public class SecurityConfig {

  private final JwtAuthenticationFilter jwtAuthenticationFilter;
  private final CustomOAuth2UserService customOAuth2UserService;
  private final OAuth2SuccessHandler oAuth2SuccessHandler;
  private final OAuth2FailureHandler oAuth2FailureHandler;
  private final ApiAuthenticationEntryPoint apiAuthenticationEntryPoint;
  private final ApiAccessDeniedHandler apiAccessDeniedHandler;

  // 보안 필터 체인(JWT, OAuth2, 인가 규칙) 설정
  @Bean
  public SecurityFilterChain filterChain(HttpSecurity http) {
    http.csrf(AbstractHttpConfigurer::disable)
        .formLogin(AbstractHttpConfigurer::disable)
        .httpBasic(AbstractHttpConfigurer::disable)
        .sessionManagement(
            session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
        .exceptionHandling(
            exception ->
                exception
                    .authenticationEntryPoint(apiAuthenticationEntryPoint)
                    .accessDeniedHandler(apiAccessDeniedHandler))
        .authorizeHttpRequests(
            auth ->
                auth.requestMatchers(
                        "/swagger-ui/**", "/v3/api-docs/**", "/swagger-resources/**", "/webjars/**")
                    .permitAll()
                    .requestMatchers("/samples/**")
                    .permitAll()
                    .requestMatchers("/api/media/hls/**")
                    .permitAll()
                    .requestMatchers("/uploads/courses/*/lesson-video/*_hls/**")
                    .denyAll()
                    .requestMatchers(HttpMethod.GET, "/uploads/**")
                    .permitAll()
                    .requestMatchers("/api/auth/signup", "/api/auth/login", "/api/auth/reissue")
                    .permitAll()
                    .requestMatchers("/oauth2/**", "/login/oauth2/**")
                    .permitAll()
                    .requestMatchers("/ws/voice-signaling")
                    .permitAll()
                    .requestMatchers("/ws/qna")
                    .permitAll()
                    // 공통 로드맵 조회 API는 누구나 접근 가능하도록 허용
                    .requestMatchers(HttpMethod.GET, "/api/roadmaps/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/home/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/notices/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/courses/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/instructors/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/showcases/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/jobs", "/api/jobs/*")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/jobs/jobkorea")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/workspaces/hub/projects")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/lounge/shell", "/api/lounge/squads/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/mentorings/hub")
                    .permitAll()
                    .requestMatchers(
                        HttpMethod.GET, "/api/portfolios/public/**", "/api/public/portfolios/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/admin/permissions/users/*")
                    .hasAnyAuthority(SUPER_ADMIN_AUTHORITY, ACCOUNT_MANAGE)
                    .requestMatchers(HttpMethod.PATCH, "/api/admin/permissions/users/*/role")
                    .hasAnyAuthority(SUPER_ADMIN_AUTHORITY, ACCOUNT_MANAGE)
                    .requestMatchers("/api/admin/permissions/**")
                    .hasAuthority(SUPER_ADMIN_AUTHORITY)
                    .requestMatchers("/api/admin/dashboard/**", "/api/admin/system/**")
                    .hasAnyAuthority(SUPER_ADMIN_AUTHORITY, DASHBOARD_READ)
                    .requestMatchers("/api/admin/accounts/**")
                    .hasAnyAuthority(SUPER_ADMIN_AUTHORITY, ACCOUNT_MANAGE)
                    .requestMatchers(
                        "/api/admin/tags/**",
                        "/api/admin/roadmaps/**",
                        "/api/admin/nodes/**",
                        "/api/admin/node-resources/**",
                        "/api/admin/course-catalog/**",
                        "/api/admin/roadmap-hub/**",
                        "/api/admin/course-node-mappings/**",
                        "/api/admin/courses/*/node-mapping",
                        "/api/admin/system-policies/**",
                        "/api/admin/streaming-policy/**")
                    .hasAnyAuthority(SUPER_ADMIN_AUTHORITY, GOVERNANCE_MANAGE)
                    .requestMatchers(
                        "/api/admin/moderations/**",
                        "/api/admin/courses/pending",
                        "/api/admin/courses/review-history",
                        "/api/admin/courses/*/approve",
                        "/api/admin/courses/*/reject")
                    .hasAnyAuthority(SUPER_ADMIN_AUTHORITY, MODERATION_RESOLVE)
                    .requestMatchers("/api/admin/jobs/**", "/api/admin/companies/**")
                    .hasAnyAuthority(SUPER_ADMIN_AUTHORITY, JOB_MANAGE)
                    .requestMatchers(
                        "/api/admin/learning-metrics/**",
                        "/api/admin/learning-rules/**",
                        "/api/admin/recommendation-settings/**",
                        "/api/admin/experiments/**",
                        "/api/admin/analytics/**",
                        "/api/admin/market/**")
                    .hasAnyAuthority(SUPER_ADMIN_AUTHORITY, LEARNING_MANAGE)
                    .requestMatchers("/api/admin/notices/**")
                    .hasAnyAuthority(SUPER_ADMIN_AUTHORITY, NOTICE_WRITE)
                    .requestMatchers("/api/admin/refunds/**", "/api/admin/settlements/**")
                    .hasAnyAuthority(SUPER_ADMIN_AUTHORITY, FINANCE_MANAGE)
                    .requestMatchers("/api/admin/**")
                    .hasAuthority(SUPER_ADMIN_AUTHORITY)
                    .requestMatchers("/api/instructor/**", "/api/evaluation/instructor/**")
                    .hasRole("INSTRUCTOR")
                    .anyRequest()
                    .authenticated())
        .oauth2Login(
            oauth2 ->
                oauth2
                    .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                    .successHandler(oAuth2SuccessHandler)
                    .failureHandler(oAuth2FailureHandler))
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

    return http.build();
  }

  // 비밀번호 해시 인코더 등록
  @Bean
  public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
    return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
  }
}
