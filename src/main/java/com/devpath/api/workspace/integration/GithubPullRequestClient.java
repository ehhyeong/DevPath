package com.devpath.api.workspace.integration;

import com.devpath.common.exception.CustomException;
import com.devpath.common.exception.ErrorCode;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Component
@RequiredArgsConstructor
public class GithubPullRequestClient {

  private static final Pattern HTTPS_REPOSITORY_PATTERN =
      Pattern.compile("^https?://github\\.com/([^/]+)/([^/#?]+?)(?:\\.git)?/?(?:[#?].*)?$");
  private static final Pattern SSH_REPOSITORY_PATTERN =
      Pattern.compile("^git@github\\.com:([^/]+)/(.+?)(?:\\.git)?$");
  private static final int MAX_PULL_REQUESTS = 30;
  private static final int MAX_FILES_PER_PULL_REQUEST = 30;
  private static final int MAX_DIFF_LENGTH = 30_000;

  private final RestTemplate restTemplate;
  private final ObjectMapper objectMapper;

  @Value("${devpath.github.token:${GITHUB_TOKEN:}}")
  private String githubToken;

  public GithubRepositoryReference parseRepositoryUrl(String value) {
    String url = value == null ? "" : value.trim();
    Matcher httpsMatcher = HTTPS_REPOSITORY_PATTERN.matcher(url);
    Matcher sshMatcher = SSH_REPOSITORY_PATTERN.matcher(url);
    Matcher matcher =
        httpsMatcher.matches() ? httpsMatcher : sshMatcher.matches() ? sshMatcher : null;

    if (matcher == null) {
      throw new CustomException(
          ErrorCode.INVALID_INPUT, "GitHub 저장소 URL은 https://github.com/{owner}/{repo} 형식이어야 합니다.");
    }

    String owner = matcher.group(1);
    String name = matcher.group(2);

    if (!StringUtils.hasText(owner) || !StringUtils.hasText(name) || name.contains("/")) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "GitHub 저장소 URL 형식이 올바르지 않습니다.");
    }

    return new GithubRepositoryReference(owner, name, "https://github.com/" + owner + "/" + name);
  }

  public List<GithubPullRequest> fetchPullRequests(GithubRepositoryReference repository) {
    JsonNode pulls =
        requestJson(
            UriComponentsBuilder.fromUriString("https://api.github.com/repos/{owner}/{repo}/pulls")
                .queryParam("state", "all")
                .queryParam("sort", "updated")
                .queryParam("direction", "desc")
                .queryParam("per_page", MAX_PULL_REQUESTS)
                .build(repository.owner(), repository.name()));

    if (!pulls.isArray()) {
      return List.of();
    }

    List<GithubPullRequest> result = new ArrayList<>();
    for (JsonNode pull : pulls) {
      long number = pull.path("number").asLong();
      PullRequestFiles files = fetchPullRequestFiles(repository, number);

      result.add(
          new GithubPullRequest(
              number,
              text(pull, "title", "Pull Request #" + number),
              text(pull, "body", null),
              text(pull, "html_url", repository.normalizedUrl() + "/pull/" + number),
              text(pull, "state", "open"),
              text(pull.path("user"), "login", "github-user"),
              text(pull.path("user"), "avatar_url", null),
              text(pull.path("head"), "ref", "feature/github-pr"),
              text(pull.path("base"), "ref", "main"),
              files.filePath(),
              files.diffText(),
              files.additions(),
              files.deletions(),
              parseDateTime(text(pull, "created_at", null)),
              parseDateTime(text(pull, "updated_at", null)),
              parseDateTime(text(pull, "merged_at", null))));
    }

    return result;
  }

  private PullRequestFiles fetchPullRequestFiles(
      GithubRepositoryReference repository, long pullRequestNumber) {
    JsonNode files =
        requestJson(
            UriComponentsBuilder.fromUriString(
                    "https://api.github.com/repos/{owner}/{repo}/pulls/{number}/files")
                .queryParam("per_page", MAX_FILES_PER_PULL_REQUEST)
                .build(repository.owner(), repository.name(), pullRequestNumber));

    if (!files.isArray() || files.isEmpty()) {
      return new PullRequestFiles(".", "GitHub에서 이 Pull Request의 파일 diff를 찾지 못했습니다.", 0, 0);
    }

    String firstFilePath = ".";
    StringBuilder diff = new StringBuilder();
    int additions = 0;
    int deletions = 0;

    for (JsonNode file : files) {
      String filename = text(file, "filename", ".");
      if (".".equals(firstFilePath)) {
        firstFilePath = filename;
      }

      additions += file.path("additions").asInt(0);
      deletions += file.path("deletions").asInt(0);

      appendDiff(diff, filename, text(file, "patch", null));
      if (diff.length() >= MAX_DIFF_LENGTH) {
        break;
      }
    }

    String diffText =
        diff.length() > MAX_DIFF_LENGTH ? diff.substring(0, MAX_DIFF_LENGTH) : diff.toString();

    return new PullRequestFiles(firstFilePath, diffText, additions, deletions);
  }

  private void appendDiff(StringBuilder diff, String filename, String patch) {
    if (diff.length() > 0) {
      diff.append("\n");
    }

    diff.append("diff --git a/").append(filename).append(" b/").append(filename).append("\n");

    if (StringUtils.hasText(patch)) {
      diff.append(patch);
    } else {
      diff.append("// GitHub did not expose a text patch for this file.");
    }
  }

  private JsonNode requestJson(URI uri) {
    try {
      ResponseEntity<String> response =
          restTemplate.exchange(
              uri,
              HttpMethod.GET,
              new HttpEntity<>(headers()),
              new ParameterizedTypeReference<>() {});

      return objectMapper.readTree(response.getBody() == null ? "[]" : response.getBody());
    } catch (RestClientResponseException exception) {
      throw new CustomException(ErrorCode.INVALID_INPUT, githubErrorMessage(exception));
    } catch (Exception exception) {
      throw new CustomException(ErrorCode.INVALID_INPUT, "GitHub API 응답을 처리하지 못했습니다.");
    }
  }

  private HttpHeaders headers() {
    HttpHeaders headers = new HttpHeaders();
    headers.setAccept(List.of(MediaType.valueOf("application/vnd.github+json")));
    headers.set("X-GitHub-Api-Version", "2022-11-28");

    if (StringUtils.hasText(githubToken)) {
      headers.setBearerAuth(githubToken.trim());
    }

    return headers;
  }

  private String githubErrorMessage(RestClientResponseException exception) {
    int statusCode = exception.getStatusCode().value();

    if (statusCode == 404) {
      return "GitHub 저장소를 찾지 못했습니다. URL이 맞는지 또는 접근 권한이 있는지 확인해 주세요.";
    }

    if (statusCode == 401 || statusCode == 403) {
      return "GitHub API 접근 권한이 없습니다. 공개 저장소 URL이 아니면 서버에 GitHub 토큰 설정이 필요합니다.";
    }

    return "GitHub API 호출에 실패했습니다.";
  }

  private String text(JsonNode node, String field, String fallback) {
    JsonNode value = node.path(field);
    return value.isMissingNode() || value.isNull() ? fallback : value.asText(fallback);
  }

  private LocalDateTime parseDateTime(String value) {
    if (!StringUtils.hasText(value)) {
      return null;
    }

    try {
      return OffsetDateTime.parse(value).toLocalDateTime();
    } catch (Exception ignored) {
      return null;
    }
  }

  private record PullRequestFiles(String filePath, String diffText, int additions, int deletions) {}
}
