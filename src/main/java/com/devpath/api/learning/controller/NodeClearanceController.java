package com.devpath.api.learning.controller;

import com.devpath.api.learning.service.NodeClearanceService;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Node Clearance API 컨트롤러
@Tag(name = "Learner - Node Clearance", description = "학습자 노드 클리어 판정 API")
@RestController
@RequestMapping("/api/me/node-clearances")
@RequiredArgsConstructor
public class NodeClearanceController {

    // Node Clearance 서비스
    private final NodeClearanceService nodeClearanceService;
}
