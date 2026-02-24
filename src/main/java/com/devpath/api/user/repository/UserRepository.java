package com.devpath.api.user.repository;

import com.devpath.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // 이메일로 유저 찾기 (로그인 시 사용)
    Optional<User> findByEmail(String email);

    // 이메일 중복 검사 (회원가입 시 사용)
    boolean existsByEmail(String email);
}