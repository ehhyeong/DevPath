package com.devpath.api.user.repository;

import com.devpath.domain.user.entity.UserTechStack;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface UserTechStackRepository extends JpaRepository<UserTechStack, Long> {
    
    void deleteByUserId(Long userId); // 덮어쓰기를 위한 기존 태그 삭제 기능

    /**
     * 특정 유저가 보유한 모든 태그 이름 조회
     * @param userId 유저 ID
     * @return 태그 이름 리스트
     */
    @Query("SELECT t.name FROM UserTechStack uts " +
            "JOIN uts.tag t " +
            "WHERE uts.user.id = :userId")
    List<String> findTagNamesByUserId(@Param("userId") Long userId);
}
