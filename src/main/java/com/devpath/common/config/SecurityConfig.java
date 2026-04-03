package com.devpath.common.config;

import com.devpath.common.security.ApiAccessDeniedHandler;
import com.devpath.common.security.ApiAuthenticationEntryPoint;
import com.devpath.common.security.CustomOAuth2UserService;
import com.devpath.common.security.JwtAuthenticationFilter;
import com.devpath.common.security.OAuth2FailureHandler;
import com.devpath.common.security.OAuth2SuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod; // [추가] HttpMethod 임포트
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
            session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
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
                    .requestMatchers("/api/auth/signup", "/api/auth/login", "/api/auth/reissue")
                    .permitAll()
                    .requestMatchers("/oauth2/**", "/login/oauth2/**")
                    .permitAll()
                    // [추가] 공통 로드맵 조회 API는 누구나 접근 가능하도록 허용
                    .requestMatchers(HttpMethod.GET, "/api/roadmaps/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/home/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/courses/**")
                    .permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/instructors/**")
                    .permitAll()
                    .requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")
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
