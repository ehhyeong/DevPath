package com.devpath.api.portfolio;

import static com.devpath.common.security.AuthenticationUtils.requireUserId;

import com.devpath.api.portfolio.dto.AddGithubCommitRequest;
import com.devpath.api.portfolio.dto.AddPortfolioItemRequest;
import com.devpath.api.portfolio.dto.CreatePortfolioRequest;
import com.devpath.api.portfolio.dto.PortfolioGithubCommitResponse;
import com.devpath.api.portfolio.dto.PortfolioItemResponse;
import com.devpath.api.portfolio.dto.PortfolioPdfVersionResponse;
import com.devpath.api.portfolio.dto.PortfolioResponse;
import com.devpath.api.portfolio.dto.UpdatePortfolioRequest;
import com.devpath.api.portfolio.service.PortfolioPdfService;
import com.devpath.api.portfolio.service.PortfolioService;
import com.devpath.common.response.ApiResponse;
import com.devpath.common.swagger.SwaggerErrorResponse;
import com.devpath.domain.portfolio.entity.PortfolioItemType;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Tag(name = "Portfolio API", description = "포트폴리오 빌더 API")
public class PortfolioController {

  private final PortfolioService portfolioService;
  private final PortfolioPdfService portfolioPdfService;

  @PostMapping("/portfolios")
  @Operation(summary = "포트폴리오 생성", description = "나의 포트폴리오를 생성합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "생성 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "401",
        description = "인증 필요",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<PortfolioResponse> createPortfolio(
      @Valid @RequestBody CreatePortfolioRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(portfolioService.createPortfolio(requireUserId(userId), request));
  }

  @GetMapping("/portfolios/me")
  @Operation(summary = "내 포트폴리오 조회", description = "나의 포트폴리오를 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "포트폴리오 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<PortfolioResponse> getMyPortfolio(
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(portfolioService.getMyPortfolio(requireUserId(userId)));
  }

  @GetMapping("/portfolios/{portfolioId}")
  @Operation(summary = "포트폴리오 상세 조회", description = "포트폴리오 상세 정보를 조회합니다. 비공개 포트폴리오는 본인만 조회 가능합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "포트폴리오 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<PortfolioResponse> getPortfolio(
      @Parameter(description = "포트폴리오 ID", example = "1") @PathVariable Long portfolioId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(portfolioService.getPortfolio(portfolioId, requireUserId(userId)));
  }

  @PatchMapping("/portfolios/{portfolioId}")
  @Operation(summary = "포트폴리오 수정", description = "포트폴리오 기본 정보를 수정합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "수정 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "404",
        description = "포트폴리오 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<PortfolioResponse> updatePortfolio(
      @Parameter(description = "포트폴리오 ID", example = "1") @PathVariable Long portfolioId,
      @Valid @RequestBody UpdatePortfolioRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        portfolioService.updatePortfolio(portfolioId, requireUserId(userId), request));
  }

  @PostMapping("/portfolios/{portfolioId}/items/proof-cards")
  @Operation(summary = "ProofCard 항목 추가", description = "포트폴리오에 ProofCard를 추가합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "추가 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<PortfolioItemResponse> addProofCard(
      @Parameter(description = "포트폴리오 ID", example = "1") @PathVariable Long portfolioId,
      @Valid @RequestBody AddPortfolioItemRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        portfolioService.addItem(
            portfolioId, requireUserId(userId), PortfolioItemType.PROOF_CARD, request));
  }

  @PostMapping("/portfolios/{portfolioId}/items/assignments")
  @Operation(summary = "Assignment 항목 추가", description = "포트폴리오에 과제를 추가합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "추가 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<PortfolioItemResponse> addAssignment(
      @Parameter(description = "포트폴리오 ID", example = "1") @PathVariable Long portfolioId,
      @Valid @RequestBody AddPortfolioItemRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        portfolioService.addItem(
            portfolioId, requireUserId(userId), PortfolioItemType.ASSIGNMENT, request));
  }

  @PostMapping("/portfolios/{portfolioId}/items/tils")
  @Operation(summary = "TIL 항목 추가", description = "포트폴리오에 TIL을 추가합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "추가 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<PortfolioItemResponse> addTil(
      @Parameter(description = "포트폴리오 ID", example = "1") @PathVariable Long portfolioId,
      @Valid @RequestBody AddPortfolioItemRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        portfolioService.addItem(
            portfolioId, requireUserId(userId), PortfolioItemType.TIL, request));
  }

  @PostMapping("/portfolios/{portfolioId}/items/projects")
  @Operation(summary = "Project 항목 추가", description = "포트폴리오에 프로젝트를 추가합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "추가 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<PortfolioItemResponse> addProject(
      @Parameter(description = "포트폴리오 ID", example = "1") @PathVariable Long portfolioId,
      @Valid @RequestBody AddPortfolioItemRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        portfolioService.addItem(
            portfolioId, requireUserId(userId), PortfolioItemType.PROJECT, request));
  }

  @PostMapping("/portfolios/{portfolioId}/github-commits")
  @Operation(summary = "GitHub 커밋 추가", description = "포트폴리오에 GitHub 커밋을 추가합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "추가 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<PortfolioGithubCommitResponse> addGithubCommit(
      @Parameter(description = "포트폴리오 ID", example = "1") @PathVariable Long portfolioId,
      @Valid @RequestBody AddGithubCommitRequest request,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        portfolioService.addGithubCommit(portfolioId, requireUserId(userId), request));
  }

  @PostMapping("/portfolios/{portfolioId}/public-link")
  @Operation(summary = "공개 링크 생성", description = "포트폴리오 공개 링크를 생성합니다. 기존 토큰은 재생성됩니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "생성 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<PortfolioResponse> generatePublicLink(
      @Parameter(description = "포트폴리오 ID", example = "1") @PathVariable Long portfolioId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(portfolioService.generatePublicLink(portfolioId, requireUserId(userId)));
  }

  @PostMapping("/portfolios/{portfolioId}/pdf")
  @Operation(summary = "PDF 생성 요청", description = "포트폴리오 PDF 생성을 요청합니다. [STUB]")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "요청 성공"),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "403",
        description = "권한 없음",
        content = @Content(schema = @Schema(implementation = SwaggerErrorResponse.class)))
  })
  public ApiResponse<PortfolioPdfVersionResponse> requestPdf(
      @Parameter(description = "포트폴리오 ID", example = "1") @PathVariable Long portfolioId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(portfolioPdfService.requestPdf(portfolioId, requireUserId(userId)));
  }

  @GetMapping("/portfolios/{portfolioId}/pdf/versions")
  @Operation(summary = "PDF 버전 목록", description = "포트폴리오의 PDF 버전 목록을 조회합니다.")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공")
  })
  public ApiResponse<List<PortfolioPdfVersionResponse>> getPdfVersions(
      @Parameter(description = "포트폴리오 ID", example = "1") @PathVariable Long portfolioId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(portfolioPdfService.getPdfVersions(portfolioId, requireUserId(userId)));
  }

  @GetMapping("/portfolios/{portfolioId}/pdf/download-histories")
  @Operation(summary = "PDF 다운로드 이력", description = "PDF 다운로드 이력을 조회합니다. [STUB]")
  @ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(
        responseCode = "200",
        description = "조회 성공")
  })
  public ApiResponse<List<Object>> getDownloadHistories(
      @Parameter(description = "포트폴리오 ID", example = "1") @PathVariable Long portfolioId,
      @Parameter(hidden = true) @AuthenticationPrincipal Long userId) {
    return ApiResponse.ok(
        portfolioPdfService.getDownloadHistories(portfolioId, requireUserId(userId)));
  }
}
