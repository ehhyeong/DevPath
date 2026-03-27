package com.devpath.api.learning.controller;

import com.devpath.api.learning.dto.NodeClearanceRequest;
import com.devpath.api.learning.dto.NodeClearanceResponse;
import com.devpath.api.learning.service.NodeClearanceService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Learner - Node Clearance", description = "Learner node clearance APIs")
@RestController
@RequestMapping("/api/me/node-clearances")
@RequiredArgsConstructor
public class NodeClearanceController {

    private final NodeClearanceService nodeClearanceService;

    @Operation(summary = "Recalculate node clearance", description = "Recalculates node clearance status for a roadmap.")
    @PostMapping("/recalculate")
    public ResponseEntity<ApiResponse<List<NodeClearanceResponse.Detail>>> recalculate(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Valid @RequestBody NodeClearanceRequest.Recalculate request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(nodeClearanceService.recalculate(userId, request)));
    }

    @Operation(summary = "Get node clearance", description = "Returns the current clearance result for a node.")
    @GetMapping("/{nodeId}")
    public ResponseEntity<ApiResponse<NodeClearanceResponse.Detail>> getNodeClearance(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "Roadmap node ID", example = "10") @PathVariable Long nodeId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(nodeClearanceService.getNodeClearance(userId, nodeId)));
    }

    @Operation(summary = "List node clearances", description = "Returns node clearance results for a roadmap.")
    @GetMapping
    public ResponseEntity<ApiResponse<List<NodeClearanceResponse.Detail>>> getNodeClearances(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "Roadmap ID", example = "1") @RequestParam(required = false) Long roadmapId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(nodeClearanceService.getNodeClearances(userId, roadmapId)));
    }

    @Operation(summary = "List clearance reasons", description = "Returns the clearance reasons for a node.")
    @GetMapping("/{nodeId}/reasons")
    public ResponseEntity<ApiResponse<List<NodeClearanceResponse.ReasonDetail>>> getNodeClearanceReasons(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "Roadmap node ID", example = "10") @PathVariable Long nodeId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(nodeClearanceService.getNodeClearanceReasons(userId, nodeId)));
    }

    @Operation(summary = "Proof check", description = "Checks whether proof issuance conditions are satisfied for a node.")
    @PostMapping("/{nodeId}/proof-check")
    public ResponseEntity<ApiResponse<NodeClearanceResponse.ProofCheck>> proofCheck(
        @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
        @Parameter(description = "Roadmap node ID", example = "10") @PathVariable Long nodeId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(nodeClearanceService.proofCheck(userId, nodeId)));
    }
}
