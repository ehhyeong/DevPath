package com.devpath.api.user.repository;

import com.devpath.domain.user.entity.UserTechStack;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserTechStackRepository extends JpaRepository<UserTechStack, Long> {
    void deleteByUserId(Long userId); // 덮어쓰기를 위한 기존 태그 삭제 기능
}