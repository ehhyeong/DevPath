package com.devpath.api.job.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;

class JobkoreaCompanyLogoClientTest {
  private static final String LOGO =
      "https://imgs.jobkorea.co.kr/img1/Co_Logo/Logo/company.gif?v=1&hash=r";
  private static final String HTML =
      "<html><head><meta property='og:image' content='//file1.jobkorea.co.kr/banner/share.png'></head><body><img src='//imgs.jobkorea.co.kr/img1/Co_Logo/Logo/company.gif?v=1&amp;hash=r'></body></html>";
  private final HttpClient http = mock(HttpClient.class);
  private final JobkoreaCompanyLogoClient client = new JobkoreaCompanyLogoClient(http);

  @Test
  void resolvesRegisteredLogoAndCachesRepeatedCompanyLookups() throws Exception {
    doReturn(response(200, HTML, Map.of())).when(http).send(any(), any());

    assertThat(client.findLogo("/Recruit/Co_Read/C/test-company")).contains(URI.create(LOGO));
    assertThat(client.findLogo("/Recruit/Co_Read/C/test-company")).contains(URI.create(LOGO));
    var request = ArgumentCaptor.forClass(HttpRequest.class);
    verify(http).send(request.capture(), any());
    assertThat(request.getValue().uri())
        .isEqualTo(URI.create("https://www.jobkorea.co.kr/Recruit/Co_Read/C/test-company"));
  }

  @Test
  void followsLegacyCompanyRedirectWithoutTrackingQuery() throws Exception {
    doReturn(
            response(
                302, "", Map.of("location", java.util.List.of("/Company/12345/Info?api=secret"))),
            response(200, HTML, Map.of()))
        .when(http)
        .send(any(), any());

    assertThat(client.findLogo("/Recruit/Co_Read/C/company")).contains(URI.create(LOGO));
    var request = ArgumentCaptor.forClass(HttpRequest.class);
    verify(http, times(2)).send(request.capture(), any());
    assertThat(request.getAllValues().get(1).uri().toString())
        .isEqualTo("https://www.jobkorea.co.kr/Company/12345/Info");
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "https://localhost/",
        "//localhost/",
        "/Recruit/Co_Read/C/../admin",
        "/Company/12/Info?api=secret",
        "/Company/%2e%2e/Info",
        "/service/api"
      })
  void rejectsPathsOutsideCompanyInformation(String path) {
    assertThat(client.findLogo(path)).isEmpty();
    verifyNoInteractions(http);
  }

  @ParameterizedTest
  @ValueSource(
      strings = {
        "https://127.0.0.1/Company/1/Info",
        "https://www.jobkorea.co.kr.evil.test/Company/1/Info",
        "https://www.jobkorea.co.kr:444/Company/1/Info",
        "https://user@www.jobkorea.co.kr/Company/1/Info",
        "http://www.jobkorea.co.kr/Company/1/Info",
        "https://www.jobkorea.co.kr/service/api"
      })
  void rejectsUntrustedRedirects(String target) throws Exception {
    doReturn(response(302, "", Map.of("location", java.util.List.of(target))))
        .when(http)
        .send(any(), any());
    assertThat(client.findLogo("/Company/1/Info")).isEmpty();
    verify(http).send(any(), any());
  }

  @Test
  void doesNotUseSharedPreviewOrUntrustedImageAsCompanyLogo() throws Exception {
    doReturn(
            response(
                200,
                "<meta property='og:image' content='https://file1.jobkorea.co.kr/share.png'><img src='https://evil.test/Co_Logo/company.png'>",
                Map.of()))
        .when(http)
        .send(any(), any());
    assertThat(client.findLogo("/Company/1/Info")).isEmpty();
    assertThat(client.findLogo("/Company/1/Info")).isEmpty();
    verify(http).send(any(), any());
  }

  @Test
  void returnsNoLogoWhenCompanyPageIsUnavailable() throws Exception {
    doThrow(new IOException("timeout")).when(http).send(any(), any());
    assertThat(client.findLogo("/Company/1/Info")).isEmpty();
  }

  @Test
  void limitsRedirectLoops() throws Exception {
    doReturn(response(302, "", Map.of("location", java.util.List.of("/Company/1/Info"))))
        .when(http)
        .send(any(), any());
    assertThat(client.findLogo("/Company/1/Info")).isEmpty();
    verify(http, times(4)).send(any(), any());
  }

  @SuppressWarnings("unchecked")
  private HttpResponse<InputStream> response(
      int status, String html, Map<String, java.util.List<String>> headers) {
    HttpResponse<InputStream> response = mock(HttpResponse.class);
    when(response.statusCode()).thenReturn(status);
    when(response.headers()).thenReturn(HttpHeaders.of(headers, (name, value) -> true));
    when(response.body())
        .thenAnswer(invocation -> new ByteArrayInputStream(html.getBytes(StandardCharsets.UTF_8)));
    return response;
  }
}
