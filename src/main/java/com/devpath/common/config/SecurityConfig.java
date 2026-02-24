package com.devpath.common.config;

import com.devpath.common.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor // 우리가 만든 필터를 자동으로 주입(DI)받기 위해 필요함
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter; // JWT 검문소 필터 가져오기

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // 1. REST API 서버이므로 CSRF 보호 비활성화
                .csrf(AbstractHttpConfigurer::disable)
                // 2. 폼 로그인 창 비활성화
                .formLogin(AbstractHttpConfigurer::disable)
                // 3. 기본 HTTP Basic 인증 비활성화
                .httpBasic(AbstractHttpConfigurer::disable)
                // 4. 세션을 사용하지 않고 JWT를 사용할 것이므로 세션 상태를 STATELESS로 설정
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // 5. URL별 접근 권한 세팅
                .authorizeHttpRequests(auth -> auth
                        // Swagger 관련 경로는 로그인 없이 누구나 프리패스
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-resources/**", "/webjars/**").permitAll()
                        // 회원가입, 로그인 경로는 로그인 없이 누구나 접근 가능
                        .requestMatchers("/api/auth/**").permitAll()
                        // 나머지는 일단 로그인이 필요하다고 설정해둠
                        .anyRequest().authenticated()
                )
                // 6. 추가: 기본 로그인 필터가 작동하기 전에, 우리가 만든 JWT 필터가 먼저 토큰을 낚아채서 검사하도록 설정
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
    // 비밀번호를 안전하게 암호화해주는 도구 (BCrypt)
    @Bean
    public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
        return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
    }
}