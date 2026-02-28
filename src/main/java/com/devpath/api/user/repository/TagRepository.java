package com.devpath.api.user.repository;

import com.devpath.domain.user.entity.Tag;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TagRepository extends JpaRepository<Tag, Long> {
}