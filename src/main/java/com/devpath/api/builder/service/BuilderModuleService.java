package com.devpath.api.builder.service;

import com.devpath.api.builder.dto.BuilderModuleDto;
import com.devpath.domain.builder.repository.BuilderModuleRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class BuilderModuleService {

  private final BuilderModuleRepository builderModuleRepository;

  @Transactional(readOnly = true)
  public List<BuilderModuleDto> getModulesByCategory(String category) {
    return builderModuleRepository.findByCategoryOrderBySortOrder(category).stream()
        .map(BuilderModuleDto::from)
        .toList();
  }
}
