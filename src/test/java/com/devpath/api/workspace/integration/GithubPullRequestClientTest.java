package com.devpath.api.workspace.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

@ExtendWith(MockitoExtension.class)
class GithubPullRequestClientTest {

  @Mock private RestTemplate restTemplate;

  private GithubPullRequestClient client;
  private List<URI> requestedUris;
  private List<HttpEntity<?>> requestedEntities;

  @BeforeEach
  void setUp() {
    client = new GithubPullRequestClient(restTemplate, new ObjectMapper());
    requestedUris = new ArrayList<>();
    requestedEntities = new ArrayList<>();
  }

  @Test
  @SuppressWarnings({"unchecked", "rawtypes"})
  void fetchPullRequests_limitsUnauthenticatedSyncToFivePullRequestsAndFiveFileRequests() {
    ReflectionTestUtils.setField(client, "githubToken", "");
    stubGithubApi(7);

    client.fetchPullRequests(repository());

    assertThat(requestedUris.get(0).getQuery()).contains("per_page=5");
    assertThat(countFileRequests()).isEqualTo(5);
  }

  @Test
  @SuppressWarnings({"unchecked", "rawtypes"})
  void fetchPullRequests_usesFullSyncLimitWhenTokenExists() {
    ReflectionTestUtils.setField(client, "githubToken", "github-token");
    stubGithubApi(7);

    client.fetchPullRequests(repository());

    assertThat(requestedUris.get(0).getQuery()).contains("per_page=30");
    assertThat(countFileRequests()).isEqualTo(7);
  }

  @Test
  @SuppressWarnings({"unchecked", "rawtypes"})
  void fetchPullRequests_usesRepositoryTokenBeforeGlobalToken() {
    ReflectionTestUtils.setField(client, "githubToken", "");
    stubGithubApi(7);

    client.fetchPullRequests(repository(), "workspace-token");

    assertThat(requestedUris.get(0).getQuery()).contains("per_page=30");
    assertThat(countFileRequests()).isEqualTo(7);
    assertThat(requestedEntities.get(0).getHeaders().getFirst(HttpHeaders.AUTHORIZATION))
        .isEqualTo("Bearer workspace-token");
  }

  @Test
  @SuppressWarnings({"unchecked", "rawtypes"})
  void fetchPullRequests_keepsFileListWhenAggregateDiffLimitIsReached() {
    ReflectionTestUtils.setField(client, "githubToken", "github-token");
    stubGithubApiWithFilesJson(1, largeFilesJson());

    List<GithubPullRequest> pullRequests = client.fetchPullRequests(repository());

    assertThat(requestedUris.get(1).getQuery()).contains("per_page=100");
    assertThat(pullRequests.get(0).files()).hasSize(3);
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  private void stubGithubApi(int pullRequestCount) {
    stubGithubApiWithFilesJson(pullRequestCount, filesJson());
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  private void stubGithubApiWithFilesJson(int pullRequestCount, String filesJson) {
    when(restTemplate.exchange(
            any(URI.class),
            eq(HttpMethod.GET),
            any(HttpEntity.class),
            any(ParameterizedTypeReference.class)))
        .thenAnswer(
            invocation -> {
              URI uri = invocation.getArgument(0);
              HttpEntity<?> entity = invocation.getArgument(2);
              requestedUris.add(uri);
              requestedEntities.add(entity);

              if (uri.getPath().endsWith("/pulls")) {
                return ResponseEntity.ok(pullRequestsJson(pullRequestCount));
              }

              return ResponseEntity.ok(filesJson);
            });
  }

  private long countFileRequests() {
    return requestedUris.stream().filter(uri -> uri.getPath().endsWith("/files")).count();
  }

  private GithubRepositoryReference repository() {
    return new GithubRepositoryReference("owner", "repo", "https://github.com/owner/repo");
  }

  private String pullRequestsJson(int count) {
    StringBuilder json = new StringBuilder("[");
    for (int index = 1; index <= count; index++) {
      if (index > 1) {
        json.append(",");
      }
      json.append(
          """
          {
            "number": %d,
            "title": "PR %d",
            "body": "body",
            "html_url": "https://github.com/owner/repo/pull/%d",
            "state": "open",
            "user": {"login": "dev", "avatar_url": null},
            "head": {"ref": "feature/test"},
            "base": {"ref": "main"},
            "created_at": "2026-05-31T00:00:00Z",
            "updated_at": "2026-05-31T00:00:00Z",
            "merged_at": null
          }
          """
              .formatted(index, index, index));
    }
    json.append("]");
    return json.toString();
  }

  private String filesJson() {
    return """
        [
          {
            "filename": "src/App.java",
            "patch": "@@ -1 +1 @@\\n-old\\n+new",
            "additions": 1,
            "deletions": 1,
            "status": "modified"
          }
        ]
        """;
  }

  private String largeFilesJson() {
    String largePatch = "+".repeat(31_000);
    return """
        [
          {
            "filename": "src/Large.java",
            "patch": "%s",
            "additions": 31000,
            "deletions": 0,
            "status": "modified"
          },
          {
            "filename": "src/Second.java",
            "patch": "@@ -1 +1 @@\\n-old\\n+new",
            "additions": 1,
            "deletions": 1,
            "status": "modified"
          },
          {
            "filename": "src/Third.java",
            "patch": "@@ -1 +1 @@\\n-old\\n+new",
            "additions": 1,
            "deletions": 1,
            "status": "modified"
          }
        ]
        """
        .formatted(largePatch);
  }
}
