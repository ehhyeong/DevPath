package com.devpath.domain.job.repository;

import com.devpath.domain.job.entity.Company;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyRepository extends JpaRepository<Company, Long> {

  boolean existsByNameAndIsDeletedFalse(String name);

  List<Company> findAllByIsDeletedFalseOrderByCreatedAtDesc();

  List<Company> findAllByOrderByCreatedAtDesc();

  Optional<Company> findByIdAndIsDeletedFalse(Long id);

  Optional<Company> findByNameAndIsDeletedFalse(String name);
}
