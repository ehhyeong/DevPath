package com.devpath.domain.user.repository;

import com.devpath.domain.user.entity.UserTechStack;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserTechStackRepository extends JpaRepository<UserTechStack, Long> {
  void deleteByUserId(Long userId);

  @Query(
      "SELECT t.name FROM UserTechStack uts " + "JOIN uts.tag t " + "WHERE uts.user.id = :userId")
  List<String> findTagNamesByUserId(@Param("userId") Long userId);

  @Modifying
  @Query("DELETE FROM UserTechStack uts WHERE uts.tag.tagId = :tagId")
  void deleteAllByTagId(@Param("tagId") Long tagId);
}
