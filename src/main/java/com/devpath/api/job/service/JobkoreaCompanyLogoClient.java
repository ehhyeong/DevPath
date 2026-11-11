package com.devpath.api.job.service;

import java.io.IOException;
import java.io.StringReader;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import javax.swing.text.MutableAttributeSet;
import javax.swing.text.html.HTML;
import javax.swing.text.html.HTMLEditorKit;
import javax.swing.text.html.parser.ParserDelegator;
import org.springframework.stereotype.Component;
import org.springframework.util.ConcurrentLruCache;

@Component
public class JobkoreaCompanyLogoClient {
  private static final String COMPANY_HOST = "www.jobkorea.co.kr";
  private static final int MAX_HTML_BYTES = 2_000_000;
  private final HttpClient httpClient;
  // 화면에 노출된 기업만 최대 256개 보관해 반복 스캔/동일 기업 카드의 재조회를 줄인다.
  private final ConcurrentLruCache<String, CachedLogo> cache =
      new ConcurrentLruCache<>(
          256,
          path -> {
            Optional<URI> logo = loadLogo(path);
            return new CachedLogo(
                logo,
                Instant.now().plus(logo.isPresent() ? Duration.ofHours(1) : Duration.ofMinutes(5)));
          });

  private record CachedLogo(Optional<URI> logo, Instant expiresAt) {}

  public JobkoreaCompanyLogoClient() {
    this(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build());
  }

  JobkoreaCompanyLogoClient(HttpClient httpClient) {
    this.httpClient = httpClient;
  }

  public Optional<URI> findLogo(String companyPath) {
    if (!isCompanyPath(companyPath)) return Optional.empty();
    CachedLogo cached = cache.get(companyPath);
    if (cached.expiresAt().isBefore(Instant.now())) {
      cache.remove(companyPath);
      cached = cache.get(companyPath);
    }
    return cached.logo();
  }

  private Optional<URI> loadLogo(String companyPath) {
    URI page = URI.create("https://" + COMPANY_HOST + companyPath);

    try {
      // 구형 기업정보 링크는 새 기업정보 주소로 이동한다. 각 이동 대상을 다시 검증한다.
      for (int attempt = 0; attempt < 4; attempt++) {
        HttpRequest request =
            HttpRequest.newBuilder(page)
                .timeout(Duration.ofSeconds(5))
                .header("Accept", "text/html")
                .GET()
                .build();
        HttpResponse<java.io.InputStream> response =
            httpClient.send(request, HttpResponse.BodyHandlers.ofInputStream());
        try (var body = response.body()) {
          if (response.statusCode() >= 300 && response.statusCode() < 400) {
            URI next = page.resolve(response.headers().firstValue("location").orElseThrow());
            if (!COMPANY_HOST.equalsIgnoreCase(next.getHost())
                || next.getPort() != -1
                || next.getUserInfo() != null
                || !"https".equalsIgnoreCase(next.getScheme())
                || !isCompanyPath(next.getRawPath())) return Optional.empty();
            // API 키나 추적 쿼리를 로고 요청에 전달하지 않는다.
            page = URI.create("https://" + COMPANY_HOST + next.getRawPath());
            continue;
          }
          if (response.statusCode() != 200) return Optional.empty();
          byte[] html = body.readNBytes(MAX_HTML_BYTES + 1);
          if (html.length > MAX_HTML_BYTES) return Optional.empty();
          return extractLogo(new String(html, StandardCharsets.UTF_8));
        }
      }
    } catch (InterruptedException exception) {
      Thread.currentThread().interrupt();
    } catch (IOException | IllegalArgumentException | java.util.NoSuchElementException exception) {
      // 기업 페이지 조회 실패는 공고 조회를 실패시키지 않고 카드의 이니셜로 대체한다.
      return Optional.empty();
    }
    return Optional.empty();
  }

  private boolean isCompanyPath(String path) {
    return path != null
        && (path.matches("/Recruit/Co_Read/C/[A-Za-z0-9_-]+/?")
            || path.matches("/Company/[0-9]+/Info/?"));
  }

  Optional<URI> extractLogo(String html) throws IOException {
    URI[] logo = new URI[1];
    new ParserDelegator()
        .parse(
            new StringReader(html),
            new HTMLEditorKit.ParserCallback() {
              @Override
              public void handleSimpleTag(
                  HTML.Tag tag, MutableAttributeSet attributes, int position) {
                if (tag != HTML.Tag.IMG || logo[0] != null) return;
                Object src = attributes.getAttribute(HTML.Attribute.SRC);
                if (src == null) return;
                try {
                  URI candidate = URI.create("https://" + COMPANY_HOST).resolve(src.toString());
                  // og:image는 기업별 로고가 아닌 잡코리아 공통 공유 이미지이므로 사용하지 않는다.
                  if ("https".equalsIgnoreCase(candidate.getScheme())
                      && "imgs.jobkorea.co.kr".equalsIgnoreCase(candidate.getHost())
                      && candidate.getPort() == -1
                      && candidate.getUserInfo() == null
                      && candidate.getPath().contains("/Co_Logo/")) logo[0] = candidate;
                } catch (IllegalArgumentException exception) {
                  // 깨진 이미지 주소는 건너뛰고 뒤의 등록 로고를 확인한다.
                }
              }
            },
            true);
    return Optional.ofNullable(logo[0]);
  }
}
