package com.devpath.api.learning.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class NodeClearanceRequest {

    @Getter
    @NoArgsConstructor
    @Schema(description = "Node clearance recalculate request")
    public static class Recalculate {

        @Schema(description = "Roadmap ID", example = "1")
        private Long roadmapId;

        @Schema(description = "Target node IDs", example = "[10,11,12]")
        private List<Long> nodeIds;
    }
}
