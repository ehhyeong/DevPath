package com.devpath.api.instructor.dto.channel;

import com.devpath.domain.user.entity.UserProfile;
import java.util.ArrayList;
import java.util.List;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ChannelResponse {

  private Long instructorId;
  private String channelName;
  private String channelDescription;
  private String introduction;
  private String profileImageUrl;
  private List<String> expertiseList;
  private List<String> externalLinks;

  public static ChannelResponse from(UserProfile userProfile) {
    List<String> links = new ArrayList<>();
    if (userProfile.getGithubUrl() != null) links.add(userProfile.getGithubUrl());
    if (userProfile.getBlogUrl() != null) links.add(userProfile.getBlogUrl());

    return ChannelResponse.builder()
        .instructorId(userProfile.getUser().getId())
        .channelName(userProfile.getChannelName())
        .channelDescription(userProfile.getBio())
        .introduction(userProfile.getBio())
        .profileImageUrl(userProfile.getDisplayProfileImage())
        .expertiseList(List.of())
        .externalLinks(links)
        .build();
  }
}
