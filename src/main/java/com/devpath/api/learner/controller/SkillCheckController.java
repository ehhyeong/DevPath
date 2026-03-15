package com.devpath.api.learner.controller;

import com.devpath.api.learner.dto.SkillCheckDto;
import com.devpath.api.learner.service.SkillCheckService;
import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.devpath.common.response.ApiResponse;
import com.devpath.domain.roadmap.entity.Roadmap;
import com.devpath.domain.roadmap.repository.RoadmapRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/me")
@RequiredArgsConstructor
@Tag(name = "?숈뒿??- ?ㅽ궗 泥댄겕", description = "?숈뒿?먯쓽 蹂댁쑀 ?ㅽ궗 愿由?諛?濡쒕뱶留?異붿쿇 API")
public class SkillCheckController {

    private final SkillCheckService skillCheckService;
    private final RoadmapRepository roadmapRepository;

    @PostMapping("/skills/check")
    @Operation(
            summary = "蹂댁쑀 ?ㅽ궗 ?깅줉",
            description = "?ъ슜?먭? 蹂댁쑀???ㅽ궗???쇨큵 ?깅줉?⑸땲?? ?대? ?깅줉???ㅽ궗? 以묐났 ?깅줉?섏? ?딆뒿?덈떎."
    )
    public ResponseEntity<ApiResponse<SkillCheckDto.RegisterSkillsResponse>> registerSkills(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @RequestBody SkillCheckDto.RegisterSkillsRequest request
    ) {
        List<String> requestedTagNames = request.getTagNames() == null ? List.of() : request.getTagNames();
        List<String> existingSkills = skillCheckService.getUserSkills(userId);
        List<String> registeredSkills = skillCheckService.registerUserSkills(userId, requestedTagNames);

        List<String> alreadyOwned = requestedTagNames.stream()
                .filter(existingSkills::contains)
                .collect(Collectors.toList());

        SkillCheckDto.RegisterSkillsResponse response = SkillCheckDto.RegisterSkillsResponse.builder()
                .registeredSkills(registeredSkills)
                .existingSkills(alreadyOwned)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/roadmaps/{roadmapId}/skill-suggestions")
    @Operation(
            summary = "濡쒕뱶留?異붿쿇 ?ㅽ궗 議고쉶",
            description = "?뱀젙 濡쒕뱶留듭쓣 ?꾨즺?섍린 ?꾪빐 ?꾩슂???ㅽ궗 以??ъ슜?먭? ?꾩쭅 蹂댁쑀?섏? ?딆? ?ㅽ궗??異붿쿇?⑸땲??"
    )
    public ResponseEntity<ApiResponse<SkillCheckDto.SuggestedSkillsResponse>> getSuggestedSkills(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "濡쒕뱶留?ID") @PathVariable Long roadmapId
    ) {
        Roadmap roadmap = roadmapRepository.findById(roadmapId)
                .orElseThrow(() -> new CustomException(ErrorCode.ROADMAP_NOT_FOUND));

        List<String> userSkills = skillCheckService.getUserSkills(userId);
        List<String> suggestedSkills = skillCheckService.suggestSkillsForRoadmap(userId, roadmapId);
        int totalRequiredSkills = userSkills.size() + suggestedSkills.size();

        double coveragePercent = totalRequiredSkills > 0
                ? (double) userSkills.size() / totalRequiredSkills * 100
                : 0.0;

        SkillCheckDto.SuggestedSkillsResponse response = SkillCheckDto.SuggestedSkillsResponse.builder()
                .roadmapId(roadmapId)
                .roadmapTitle(roadmap.getTitle())
                .userSkills(userSkills)
                .suggestedSkills(suggestedSkills)
                .totalRequiredSkills(totalRequiredSkills)
                .skillCoveragePercent(Math.round(coveragePercent * 10) / 10.0)
                .build();

        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/roadmaps/{roadmapId}/lock-status")
    @Operation(
            summary = "濡쒕뱶留??몃뱶 ?좉툑 ?곹깭 議고쉶",
            description = "濡쒕뱶留듭쓽 紐⑤뱺 ?몃뱶??????좉툑/?닿툑 ?곹깭瑜?議고쉶?⑸땲??"
    )
    public ResponseEntity<ApiResponse<SkillCheckDto.RoadmapLockStatusResponse>> getRoadmapLockStatus(
            @Parameter(hidden = true) @AuthenticationPrincipal Long userId,
            @Parameter(description = "濡쒕뱶留?ID") @PathVariable Long roadmapId
    ) {
        return ResponseEntity.ok(ApiResponse.ok(skillCheckService.getRoadmapLockStatus(userId, roadmapId)));
    }
}
