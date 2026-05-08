package com.devpath.domain.user.repository;

import com.devpath.domain.user.entity.AccountStatus;
import com.devpath.domain.user.entity.User;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {

  Optional<User> findByEmail(String email);

  boolean existsByEmail(String email);

  // 관리자 계정 목록은 최신 가입순으로 조회한다.
  List<User> findAllByOrderByCreatedAtDesc();

  // 운영 화면 필터를 위해 계정 상태별 목록 조회를 추가한다.
  List<User> findAllByAccountStatusOrderByCreatedAtDesc(AccountStatus accountStatus);
}
