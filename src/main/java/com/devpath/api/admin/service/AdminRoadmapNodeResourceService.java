package com.devpath.api.admin.service;

import com.devpath.api.admin.dto.governance.AdminRoadmapNodeResourceResponse;
import com.devpath.api.admin.dto.governance.RoadmapNodeResourceUpsertRequest;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.entity.RoadmapNodeResource;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeResourceRepository;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminRoadmapNodeResourceService {

  private static final Set<String> ALLOWED_SOURCE_TYPES =
      Set.of("BLOG", "DOCS", "VIDEO", "OFFICIAL", "COURSE", "OTHER");

  private final RoadmapNodeResourceRepository roadmapNodeResourceRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;

  @Transactional(readOnly = true)
  public List<AdminRoadmapNodeResourceResponse> getResources() {
    return roadmapNodeResourceRepository.findAllForAdmin().stream()
        .map(AdminRoadmapNodeResourceResponse::from)
        .toList();
  }

  public AdminRoadmapNodeResourceResponse createResource(RoadmapNodeResourceUpsertRequest request) {
    RoadmapNodeResourceUpsertRequest validRequest = requireRequest(request);
    RoadmapNode node = getOfficialPublicNode(validRequest.getNodeId());

    RoadmapNodeResource resource =
        roadmapNodeResourceRepository.save(
            RoadmapNodeResource.builder()
                .node(node)
                .title(normalizeRequiredText(validRequest.getTitle()))
                .url(normalizeUrl(validRequest.getUrl()))
                .description(normalizeNullableText(validRequest.getDescription()))
                .sourceType(normalizeSourceType(validRequest.getSourceType()))
                .sortOrder(normalizeSortOrder(validRequest.getSortOrder()))
                .active(normalizeActive(validRequest.getActive()))
                .build());

    return AdminRoadmapNodeResourceResponse.from(resource);
  }

  public AdminRoadmapNodeResourceResponse updateResource(
      Long resourceId, RoadmapNodeResourceUpsertRequest request) {
    RoadmapNodeResourceUpsertRequest validRequest = requireRequest(request);
    RoadmapNodeResource resource = getResource(resourceId);
    RoadmapNode node = getOfficialPublicNode(validRequest.getNodeId());

    resource.update(
        node,
        normalizeRequiredText(validRequest.getTitle()),
        normalizeUrl(validRequest.getUrl()),
        normalizeNullableText(validRequest.getDescription()),
        normalizeSourceType(validRequest.getSourceType()),
        normalizeSortOrder(validRequest.getSortOrder()),
        normalizeActive(validRequest.getActive()));

    return AdminRoadmapNodeResourceResponse.from(resource);
  }

  public void deleteResource(Long resourceId) {
    RoadmapNodeResource resource = getResource(resourceId);
    roadmapNodeResourceRepository.delete(resource);
  }

  private RoadmapNodeResource getResource(Long resourceId) {
    return roadmapNodeResourceRepository
        .findById(resourceId)
        .orElseThrow(() -> new CustomException(ErrorCode.RESOURCE_NOT_FOUND));
  }

  private RoadmapNode getOfficialPublicNode(Long nodeId) {
    if (nodeId == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    RoadmapNode node =
        roadmapNodeRepository
            .findById(nodeId)
            .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND));
    Roadmap roadmap = node.getRoadmap();

    if (!Boolean.TRUE.equals(roadmap.getIsOfficial())
        || !Boolean.TRUE.equals(roadmap.getIsPublic())
        || Boolean.TRUE.equals(roadmap.getIsDeleted())) {
      throw new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND);
    }

    return node;
  }

  private RoadmapNodeResourceUpsertRequest requireRequest(
      RoadmapNodeResourceUpsertRequest request) {
    if (request == null) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return request;
  }

  private String normalizeRequiredText(String value) {
    if (value == null || value.isBlank()) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return value.trim();
  }

  private String normalizeNullableText(String value) {
    if (value == null || value.isBlank()) {
      return null;
    }

    return value.trim();
  }

  private String normalizeUrl(String value) {
    String url = normalizeRequiredText(value);

    try {
      URI uri = new URI(url);
      String scheme = uri.getScheme();
      if ((!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme))
          || uri.getHost() == null) {
        throw new CustomException(ErrorCode.INVALID_INPUT);
      }
    } catch (URISyntaxException exception) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return url;
  }

  private String normalizeSourceType(String value) {
    if (value == null || value.isBlank()) {
      return "OTHER";
    }

    String sourceType = value.trim().toUpperCase();
    if (!ALLOWED_SOURCE_TYPES.contains(sourceType)) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return sourceType;
  }

  private Integer normalizeSortOrder(Integer value) {
    if (value == null) {
      return 0;
    }

    if (value < 0) {
      throw new CustomException(ErrorCode.INVALID_INPUT);
    }

    return value;
  }

  private Boolean normalizeActive(Boolean value) {
    return value == null || Boolean.TRUE.equals(value);
  }
}
