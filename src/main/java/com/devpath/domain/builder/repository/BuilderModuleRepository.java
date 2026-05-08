package com.devpath.domain.builder.repository;

import com.devpath.domain.builder.entity.BuilderModule;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BuilderModuleRepository extends JpaRepository<BuilderModule, Long> {

  List<BuilderModule> findByCategoryOrderBySortOrder(String category);
}
