package com.devpath.api.home.controller;

import com.devpath.api.home.dto.PublicHomeDto;
import com.devpath.api.home.service.PublicHomeService;
import com.devpath.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Public Home API", description = "Landing page overview API")
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/home")
public class PublicHomeController {

  private final PublicHomeService publicHomeService;

  @Operation(summary = "Get landing page overview", description = "Returns public overview data for the landing page.")
  @GetMapping("/overview")
  public ApiResponse<PublicHomeDto.OverviewResponse> getOverview() {
    return ApiResponse.ok(publicHomeService.getOverview());
  }
}
