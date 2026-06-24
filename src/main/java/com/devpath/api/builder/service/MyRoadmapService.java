package com.devpath.api.builder.service;

import com.devpath.api.builder.dto.MyRoadmapResponse;
import com.devpath.api.builder.dto.MyRoadmapSaveRequest;
import com.devpath.api.builder.dto.MyRoadmapSummary;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.domain.builder.entity.BuilderModule;
import com.devpath.domain.builder.entity.MyRoadmap;
import com.devpath.domain.builder.entity.MyRoadmapModule;
import com.devpath.domain.builder.repository.BuilderModuleRepository;
import com.devpath.domain.builder.repository.MyRoadmapRepository;
import com.devpath.domain.roadmap.entity.BranchKind;
import com.devpath.domain.roadmap.entity.CustomRoadmap;
import com.devpath.domain.roadmap.entity.CustomRoadmapNode;
import com.devpath.domain.roadmap.entity.RoadmapNode;
import com.devpath.domain.roadmap.repository.CustomRoadmapNodeRepository;
import com.devpath.domain.roadmap.repository.CustomRoadmapRepository;
import com.devpath.domain.roadmap.repository.RoadmapNodeRepository;
import com.devpath.domain.user.entity.User;
import com.devpath.domain.user.repository.UserRepository;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MyRoadmapService {

  private final MyRoadmapRepository myRoadmapRepository;
  private final BuilderModuleRepository builderModuleRepository;
  private final UserRepository userRepository;
  private final CustomRoadmapRepository customRoadmapRepository;
  private final CustomRoadmapNodeRepository customRoadmapNodeRepository;
  private final RoadmapNodeRepository roadmapNodeRepository;

  @Transactional
  public MyRoadmapResponse save(Long userId, MyRoadmapSaveRequest request) {
    User user =
        userRepository
            .findById(userId)
            .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

    request.getModules().forEach(this::validateModuleSource);

    List<Long> moduleIds =
        request.getModules().stream()
            .map(MyRoadmapSaveRequest.ModuleItem::getBuilderModuleId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();

    Map<Long, BuilderModule> moduleMap =
        builderModuleRepository.findAllById(moduleIds).stream()
            .collect(Collectors.toMap(BuilderModule::getId, m -> m));

    List<Long> originalNodeIds =
        request.getModules().stream()
            .map(MyRoadmapSaveRequest.ModuleItem::getOriginalNodeId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();

    Map<Long, RoadmapNode> originalNodeMap =
        roadmapNodeRepository.findAllById(originalNodeIds).stream()
            .collect(Collectors.toMap(RoadmapNode::getNodeId, n -> n));

    for (Long id : moduleIds) {
      if (!moduleMap.containsKey(id)) {
        throw new CustomException(ErrorCode.BUILDER_MODULE_NOT_FOUND);
      }
    }

    for (Long id : originalNodeIds) {
      if (!originalNodeMap.containsKey(id)) {
        throw new CustomException(ErrorCode.ROADMAP_NODE_NOT_FOUND);
      }
    }

    MyRoadmap myRoadmap = MyRoadmap.builder().user(user).title(request.getTitle()).build();

    request.getModules().stream()
        .filter(item -> item.getBuilderModuleId() != null)
        .forEach(
            item -> {
              MyRoadmapModule module =
                  MyRoadmapModule.builder()
                      .myRoadmap(myRoadmap)
                      .builderModule(moduleMap.get(item.getBuilderModuleId()))
                      .sortOrder(item.getSortOrder())
                      .branchGroup(item.getBranchGroup())
                      .build();
              myRoadmap.addModule(module);
            });

    myRoadmapRepository.save(myRoadmap);

    CustomRoadmap customRoadmap =
        CustomRoadmap.builderOriginBuilder().user(user).title(request.getTitle()).build();
    customRoadmapRepository.save(customRoadmap);

    // MyRoadmap ↔ CustomRoadmap 연결
    myRoadmap.linkCustomRoadmap(customRoadmap.getId());

    buildAndSaveCustomNodes(customRoadmap, request.getModules(), moduleMap, originalNodeMap);

    return MyRoadmapResponse.from(myRoadmap, customRoadmap.getId());
  }

  @Transactional(readOnly = true)
  public List<MyRoadmapSummary> findAll(Long userId) {
    return myRoadmapRepository.findSummariesByUserId(userId).stream()
        .map(
            summary ->
                new MyRoadmapSummary(
                    summary.getMyRoadmapId(),
                    summary.getTitle(),
                    summary.getCreatedAt(),
                    summary.getModuleCount()))
        .toList();
  }

  @Transactional(readOnly = true)
  public MyRoadmapResponse findById(Long userId, Long myRoadmapId) {
    MyRoadmap myRoadmap =
        myRoadmapRepository
            .findByIdWithModules(myRoadmapId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.MY_ROADMAP_NOT_FOUND));

    Long customRoadmapId = myRoadmap.getCustomRoadmapId();
    if (customRoadmapId != null) {
      return customRoadmapRepository
          .findById(customRoadmapId)
          .map(
              cr -> {
                List<CustomRoadmapNode> nodes =
                    customRoadmapNodeRepository.findAllByCustomRoadmapOrderByCustomSortOrderAsc(cr);
                return MyRoadmapResponse.from(myRoadmap, customRoadmapId, nodes);
              })
          .orElse(MyRoadmapResponse.from(myRoadmap, customRoadmapId));
    }
    return MyRoadmapResponse.from(myRoadmap, null);
  }

  @Transactional
  public MyRoadmapResponse update(Long userId, Long myRoadmapId, MyRoadmapSaveRequest request) {
    MyRoadmap myRoadmap =
        myRoadmapRepository
            .findByIdWithModules(myRoadmapId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.MY_ROADMAP_NOT_FOUND));

    request.getModules().forEach(this::validateModuleSource);

    List<Long> moduleIds =
        request.getModules().stream()
            .map(MyRoadmapSaveRequest.ModuleItem::getBuilderModuleId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();

    Map<Long, BuilderModule> moduleMap =
        builderModuleRepository.findAllById(moduleIds).stream()
            .collect(Collectors.toMap(BuilderModule::getId, m -> m));

    List<Long> originalNodeIds =
        request.getModules().stream()
            .map(MyRoadmapSaveRequest.ModuleItem::getOriginalNodeId)
            .filter(Objects::nonNull)
            .distinct()
            .toList();

    Map<Long, RoadmapNode> originalNodeMap =
        roadmapNodeRepository.findAllById(originalNodeIds).stream()
            .collect(Collectors.toMap(RoadmapNode::getNodeId, n -> n));

    // MyRoadmap 제목 + 모듈 교체
    myRoadmap.changeTitle(request.getTitle());
    myRoadmap.getModules().clear();

    request.getModules().stream()
        .filter(item -> item.getBuilderModuleId() != null)
        .forEach(
            item -> {
              MyRoadmapModule module =
                  MyRoadmapModule.builder()
                      .myRoadmap(myRoadmap)
                      .builderModule(moduleMap.get(item.getBuilderModuleId()))
                      .sortOrder(item.getSortOrder())
                      .branchGroup(item.getBranchGroup())
                      .build();
              myRoadmap.addModule(module);
            });

    // CustomRoadmap 노드 교체 (연결된 경우)
    if (myRoadmap.getCustomRoadmapId() != null) {
      customRoadmapRepository
          .findById(myRoadmap.getCustomRoadmapId())
          .ifPresent(
              customRoadmap -> {
                customRoadmap.changeTitle(request.getTitle());
                customRoadmapNodeRepository.deleteAllByCustomRoadmap(customRoadmap);

                buildAndSaveCustomNodes(
                    customRoadmap, request.getModules(), moduleMap, originalNodeMap);
              });
    }

    return MyRoadmapResponse.from(myRoadmap, myRoadmap.getCustomRoadmapId());
  }

  @Transactional
  public void delete(Long userId, Long myRoadmapId) {
    MyRoadmap myRoadmap =
        myRoadmapRepository
            .findByIdWithModules(myRoadmapId, userId)
            .orElseThrow(() -> new CustomException(ErrorCode.MY_ROADMAP_NOT_FOUND));
    myRoadmapRepository.delete(myRoadmap);
  }

  // 빌더 flat payload(sortOrder + branchGroup)를 커스텀 노드로 저장하고, 레인 필드(anchor/laneKey/kind/order)를 도출해 배치한다.
  private void buildAndSaveCustomNodes(
      CustomRoadmap customRoadmap,
      List<MyRoadmapSaveRequest.ModuleItem> modules,
      Map<Long, BuilderModule> moduleMap,
      Map<Long, RoadmapNode> originalNodeMap) {
    List<MyRoadmapSaveRequest.ModuleItem> ordered =
        modules.stream()
            .sorted(Comparator.comparingInt(MyRoadmapSaveRequest.ModuleItem::getSortOrder))
            .toList();

    // 1-pass: 노드 생성·저장(IDENTITY로 id 부여). 옛 분기필드는 dual-write 유지.
    List<CustomRoadmapNode> nodes = new ArrayList<>();
    for (MyRoadmapSaveRequest.ModuleItem item : ordered) {
      CustomRoadmapNode node =
          item.getBuilderModuleId() != null
              ? CustomRoadmapNode.builderNodeBuilder()
                  .customRoadmap(customRoadmap)
                  .builderModule(moduleMap.get(item.getBuilderModuleId()))
                  .customSortOrder(item.getSortOrder())
                  .builderBranchGroup(item.getBranchGroup())
                  .build()
              : CustomRoadmapNode.builder()
                  .customRoadmap(customRoadmap)
                  .originalNode(originalNodeMap.get(item.getOriginalNodeId()))
                  .customSortOrder(item.getSortOrder())
                  .isBranch(false)
                  .branchFromNodeId(null)
                  .branchType(null)
                  .build();
      nodes.add(customRoadmapNodeRepository.save(node));
    }

    // 2-pass: flat 구조에서 레인 도출. 척추=직전 척추가 앵커, 분기=branchGroup이 laneKey.
    CustomRoadmapNode lastSpine = null;
    int spineOrder = 0;
    Map<String, Integer> laneOrderCounters = new HashMap<>();
    for (int i = 0; i < ordered.size(); i += 1) {
      Integer branchGroup = ordered.get(i).getBranchGroup();
      CustomRoadmapNode node = nodes.get(i);
      if (branchGroup == null) {
        node.assignLane(BranchKind.SPINE, null, null, spineOrder);
        spineOrder += 1;
        lastSpine = node;
      } else {
        Long anchorId = lastSpine != null ? lastSpine.getId() : null;
        String laneId = anchorId + ":" + branchGroup;
        int orderInLane = laneOrderCounters.merge(laneId, 1, Integer::sum) - 1;
        node.assignLane(BranchKind.BRANCH, anchorId, branchGroup, orderInLane);
      }
    }
  }

  private void validateModuleSource(MyRoadmapSaveRequest.ModuleItem item) {
    boolean hasBuilderModule = item.getBuilderModuleId() != null;
    boolean hasOriginalNode = item.getOriginalNodeId() != null;
    if (hasBuilderModule == hasOriginalNode) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT, "Exactly one of builderModuleId or originalNodeId is required.");
    }
  }
}
