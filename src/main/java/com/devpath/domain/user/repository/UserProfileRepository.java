package com.devpath.domain.user.repository;

import com.devpath.domain.user.entity.UserProfile;
import com.devpath.domain.user.entity.UserRole;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

// Reads user profile data for both owner and public-facing lookups.
public interface UserProfileRepository extends JpaRepository<UserProfile, Long> {

  Optional<UserProfile> findByUserId(Long userId);

  // Fetches a publicly visible instructor profile together with the owning user.
  @EntityGraph(attributePaths = "user")
  @Query(
      """
      select up
      from UserProfile up
      join up.user u
      where u.id = :userId
        and u.role = :role
        and u.isActive = true
        and up.isPublic = true
      """)
  Optional<UserProfile> findPublicInstructorProfileByUserId(
      @Param("userId") Long userId, @Param("role") UserRole role);
}
