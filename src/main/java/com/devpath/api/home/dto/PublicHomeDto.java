package com.devpath.api.home.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

public class PublicHomeDto {

  @Getter
  @Builder
  @Schema(description = "Public landing page overview response")
  public static class OverviewResponse {
    private String badge;
    private String title;
    private String description;
    private List<ActionLink> actions;
    private List<MetricCard> metrics;
    private List<String> trendingSkills;
    private List<ContentPreview> featuredRoadmaps;
    private List<ContentPreview> featuredCourses;
    private List<ContentPreview> featuredProjects;
    private List<ContentPreview> featuredStudyGroups;
    private List<JourneyStep> journeySteps;
  }

  @Getter
  @Builder
  @Schema(description = "Landing page action link")
  public static class ActionLink {
    private String label;
    private String href;
    private String tone;
  }

  @Getter
  @Builder
  @Schema(description = "Landing page metric card")
  public static class MetricCard {
    private String label;
    private String value;
    private String description;
  }

  @Getter
  @Builder
  @Schema(description = "Landing page content preview")
  public static class ContentPreview {
    private Long id;
    private String badge;
    private String title;
    private String description;
    private String href;
  }

  @Getter
  @Builder
  @Schema(description = "Landing page journey step")
  public static class JourneyStep {
    private String step;
    private String eyebrow;
    private String title;
    private String description;
    private String ctaLabel;
    private String href;
  }
}
